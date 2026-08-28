import { CqrsAuthorization, HttpAuthorization } from "@structure-ai/authorization"
import { CommandBus, IdempotencyStore, QueryBus } from "@structure-ai/cqrs"
import { storesLayer } from "@structure-ai/eventsourcing-pg"
import * as Migrations from "@structure-ai/migrations"
import { PgClient } from "@effect/sql-pg"
import * as HttpApiBuilder from "@effect/platform/HttpApiBuilder"
import * as HttpApp from "@effect/platform/HttpApp"
import * as HttpServerRequest from "@effect/platform/HttpServerRequest"
import * as HttpServerResponse from "@effect/platform/HttpServerResponse"
import { Settings, toLayer } from "@structure-ai/config"
import { Docs, serve } from "@structure-ai/http"
import { layer as observabilityLayer } from "@structure-ai/observability"
import { Effect, Layer, Redacted } from "effect"
import { AppAuthPg, AppAuthTag, resolvePrincipal } from "./auth.ts"
import { StaticVillaCatalog, VillaCatalog } from "./catalog.ts"
import { handlers } from "./handlers.ts"
import { ApiLive } from "./http.ts"
import { ConsoleMailer, FileStore, LocalFileStore, Mailer, QuotationPdf } from "./infra.ts"
import { bookkeepingTable, prodMigrations } from "./migrations.ts"
import { policy } from "./policy.ts"
import {
  CheckAvailability,
  GenerateQuotation,
  GetBooking,
  GetProfile,
  ListAllBookings,
  ListMyBookings,
  RequestQuotation,
  SaveProfile,
  SignQuotation,
  ValidateQuotation,
} from "./messages/index.ts"
import { appSettings } from "./settings.ts"
import { AppConfigTag } from "./views.ts"

// ---------------------------------------------------------------------------
// Composition root (production). The test composition swaps the durable
// adapters for in-memory ones and keeps everything else identical.
// Startup order, outermost in: config → observability → postgres (client,
// migrations, event store) → ports → auth → cqrs buses → http.
// ---------------------------------------------------------------------------

export const AppConfigLive = Layer.unwrapEffect(
  Effect.promise(async () =>
    toLayer(AppConfigTag, appSettings, {
      // The dotenv file is optional: containers may pass environment only.
      ...(await Bun.file(".env").exists() ? { dotEnvFile: ".env" } : {}),
    }),
  ),
)

const ObservabilityLive = Layer.unwrapEffect(
  Effect.map(AppConfigTag, (config) =>
    observabilityLayer({
      service: { name: "pointesavanne-api", version: "1.0.0" },
      logLevel: config.obs.logLevel,
      logFormat: config.obs.logFormat,
      ...(config.obs.otlpUrl._tag === "Some" ? { otlpUrl: config.obs.otlpUrl.value } : {}),
    }),
  ),
)

const PgLive = Layer.unwrapEffect(
  Effect.map(AppConfigTag, (config) =>
    PgClient.layer({
      url: config.databaseUrl,
      maxConnections: 10,
      applicationName: "pointesavanne-api",
    }),
  ),
)

/** Single designated migrator: this API process owns every schema. */
const MigrationsLive = Migrations.layer(prodMigrations).pipe(Layer.provide(bookkeepingTable()))

const EventSourcingLive = storesLayer({ tablePrefix: "es_" })

const PortsLive = Layer.mergeAll(
  StaticVillaCatalog as Layer.Layer<VillaCatalog>,
  ConsoleMailer as Layer.Layer<Mailer>,
  Layer.unwrapEffect(
    Effect.map(AppConfigTag, (config) => LocalFileStore(config.filesDir) as Layer.Layer<FileStore>),
  ),
  Layer.succeed(
    QuotationPdf,
    QuotationPdf.of({
      // Renders the quotation document (HTML, as the legacy dompdf pipeline
      // consumed); byte-true PDF rendering swaps in behind this port later.
      render: (booking) =>
        Effect.succeed(
          new TextEncoder().encode(
            [
              '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Devis</title></head><body>',
              `<h1>Devis — ${booking.villaName}</h1>`,
              `<p>Client : ${booking.customer.name} (${booking.customer.email})</p>`,
              `<p>Séjour du ${booking.from} au ${booking.to} — ${booking.adultsCount} adulte(s), ${booking.childrenCount} enfant(s)</p>`,
              "<ul>",
              `<li>Total séjour : ${booking.pricing.totalAmount} €</li>`,
              `<li>Taxe touristique (non classé) : ${booking.pricing.unrankedTouristTax} €</li>`,
              `<li>Taxe touristique (classé 4 étoiles) : ${booking.pricing.rankedTouristTax} €</li>`,
              `<li>Caution : ${booking.pricing.depositAmount} €</li>`,
              `<li>Ménage obligatoire : ${booking.pricing.householdAmount} €</li>`,
              "</ul></body></html>",
            ].join("\n"),
          ),
        ),
    }),
  ),
)

export const AuthorizerLive = CqrsAuthorization.rules(policy)
  .message(RequestQuotation, "booking:request")
  .message(SignQuotation, "booking:sign")
  .message(ValidateQuotation, "booking:validate")
  .message(GenerateQuotation, "booking:generate")
  .message(GetBooking, "booking:list-own")
  .message(ListMyBookings, "booking:list-own")
  .message(ListAllBookings, "booking:read-all")
  .message(SaveProfile, "profile:save")
  .message(GetProfile, "profile:read")
  .public(CheckAvailability)
  .layer

const BusesLive = Layer.mergeAll(CommandBus.layer, QueryBus.layer).pipe(
  Layer.provide(handlers),
  Layer.provide(AuthorizerLive),
  Layer.provide(IdempotencyStore.inMemory),
)

/**
 * Mounts the @structure-ai/auth Web handler (/auth/*) in front of the HttpApi
 * router: requests under /auth/ never reach the api groups.
 */
export const AuthRoutesLive = HttpApiBuilder.middleware(
  Effect.map(AppAuthTag, ({ handler }) => (app: HttpApp.Default) =>
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest
      // The request service is the (augmented) Web Request; its `url` is the
      // request path. /auth/* never reaches the api groups.
      if (!request.url.startsWith("/auth/")) return yield* app
      // The platform's request service is a wrapper; `source` is the native
      // Web Request with its body still unread.
      const source = (request as unknown as { readonly source: Request }).source
      const web = yield* Effect.tryPromise(() => handler(source)).pipe(Effect.orDie)
      return HttpServerResponse.fromWeb(web)
    }),
  ),
)

/** Session cookie → Principal on the fiber, for guards below the HTTP edge. */
export const PrincipalLive = HttpAuthorization.layer((request) => resolvePrincipal(request.headers.cookie ?? null))

/** The api with its edge middleware (auth routes + principal resolution). */
export const ApiWithMiddleware = ApiLive.pipe(
  Layer.provide(AuthRoutesLive),
  Layer.provide(PrincipalLive),
)

const HttpLive = Layer.unwrapEffect(
  Effect.map(AppConfigTag, (config) => serve({ port: config.http.port, gracePeriod: 5_000 })))

/**
 * Everything the API process needs, minus Shutdown/Readiness (owned by
 * launch). Members of a `Layer.mergeAll` do not see each other, so the stack
 * is one provide chain in dependency order — http → api → buses → ports →
 * auth → event store → migrations → postgres → telemetry → config.
 */
export const productionLayers = HttpLive.pipe(
  Layer.provide(Docs.layer()),
  Layer.provide(ApiWithMiddleware),
  Layer.provide(BusesLive),
  Layer.provide(AppAuthPg),
  Layer.provide(PortsLive),
  Layer.provide(MigrationsLive),
  Layer.provideMerge(EventSourcingLive),
  Layer.provideMerge(PgLive),
  Layer.provide(ObservabilityLive),
  Layer.provide(AppConfigLive),
)
