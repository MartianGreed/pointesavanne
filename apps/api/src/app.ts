import { CommandBus, IdempotencyStore, QueryBus } from "@structure-ai/cqrs"
import { storesLayer } from "@structure-ai/eventsourcing-pg"
import * as Migrations from "@structure-ai/migrations"
import { PgClient } from "@effect/sql-pg"
import { serve, Docs } from "@structure-ai/http"
import { layer as observabilityLayer } from "@structure-ai/observability"
import { Effect, Layer } from "effect"
import {
  AuthorizerLive,
  ConsoleMailer,
  DomainConfigTag,
  RateCardVillaCatalog,
  VillaCatalog,
  HtmlQuotationPdf,
  LocalFileStore,
  FileStore,
  Mailer,
  QuotationPdf,
  domainConfigOf,
  handlers,
} from "@pointesavanne/domain"
import { AppAuthPg } from "./auth.ts"
import { ApiWithMiddleware } from "./http.ts"
import { bookkeepingTable, prodMigrations } from "./migrations.ts"
import { ApiConfigLive, ApiConfigTag } from "./settings.ts"

// ---------------------------------------------------------------------------
// Composition root (production). The API process is a thin host over the
// domain package: config → telemetry → postgres (client, migrations, event
// store) → ports → auth → cqrs buses → http. The test composition (in the
// domain package) swaps the durable adapters for in-memory ones and keeps
// everything else identical.
// ---------------------------------------------------------------------------

const ObservabilityLive = Layer.unwrapEffect(
  Effect.map(ApiConfigTag, (config) =>
    observabilityLayer({
      service: { name: "pointesavanne-api", version: "1.0.0" },
      logLevel: config.obs.logLevel,
      logFormat: config.obs.logFormat,
      ...(config.obs.otlpUrl._tag === "Some" ? { otlpUrl: config.obs.otlpUrl.value } : {}),
    }),
  ),
)

const PgLive = Layer.unwrapEffect(
  Effect.map(ApiConfigTag, (config) =>
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
  // The rate card is owner-managed data: the catalog reads the RateCard
  // aggregate (seeding it once from the legacy card), so it needs the event
  // store provided further down the stack.
  RateCardVillaCatalog as Layer.Layer<VillaCatalog>,
  ConsoleMailer as Layer.Layer<Mailer>,
  HtmlQuotationPdf as Layer.Layer<QuotationPdf>,
  Layer.unwrapEffect(
    Effect.map(ApiConfigTag, (config) => LocalFileStore(config.filesDir) as Layer.Layer<FileStore>),
  ),
)

const BusesLive = Layer.mergeAll(CommandBus.layer, QueryBus.layer).pipe(
  Layer.provide(handlers),
  Layer.provide(AuthorizerLive),
  Layer.provide(IdempotencyStore.inMemory),
)

/** The domain reads its config slice off the API's full config. */
const DomainConfigLive = Layer.effect(DomainConfigTag, Effect.map(ApiConfigTag, domainConfigOf))

const HttpLive = Layer.unwrapEffect(
  Effect.map(ApiConfigTag, (config) => serve({ port: config.http.port, gracePeriod: 5_000 })))

/**
 * Everything the API process needs, minus Shutdown/Readiness (owned by
 * launch). Members of a `Layer.mergeAll` do not see each other, so the stack
 * is one provide chain in dependency order — http → api → buses → ports →
 * auth → event store → migrations → postgres → telemetry → config.
 *
 * `provideMerge` (not `provide`) for the buses, the ports and the domain
 * config: their services must land in the process context too, because the
 * projection workers main.ts forks (notifications, quotation generator)
 * consume the Mailer, the CommandBus and DomainConfigTag directly — with a
 * plain `provide` those fibers die on a missing service and the PDF/e-mail
 * pipeline silently stops.
 */
export const productionLayers = HttpLive.pipe(
  Layer.provide(Docs.layer()),
  Layer.provide(ApiWithMiddleware),
  Layer.provideMerge(BusesLive),
  Layer.provide(AppAuthPg),
  Layer.provideMerge(PortsLive),
  Layer.provide(MigrationsLive),
  Layer.provideMerge(EventSourcingLive),
  Layer.provideMerge(PgLive),
  Layer.provide(ObservabilityLive),
  Layer.provideMerge(DomainConfigLive),
  Layer.provide(ApiConfigLive),
)
