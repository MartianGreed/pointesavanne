# Pointe Savanne

Villa booking platform for Villa Pointe Savanne (Mauritius): customer accounts,
quotation requests with seasonal pricing, tourist taxes and time-based discounts,
PDF quotations, signature upload, and owner-side validation.

TypeScript monorepo — **Bun + Turborepo**, built on the
[`@structure-ai`](https://github.com/Ligerian-labs/structure) framework stack
(DDD, CQRS, event sourcing, auth, authorization, HTTP, observability) with
PostgreSQL for durability and an **Angular 22** client (SSR + SPA, French).

## Layout

```
packages/
└── domain/    @pointesavanne/domain — the business domain, reusable across
│               apps: booking & profile aggregates, pricing engine, villa
│               catalog, message contracts, access policy, handlers, views &
│               projections, ports (mailer, files, quotation PDF, auth),
│               in-memory test composition, BDD feature suite
apps/
├── api/       thin host over the domain: HTTP surface (OpenAPI at /docs),
│              production adapters (PostgreSQL event store & auth, local
│              files, console mail), migrations, process entry
└── client/    Angular 22 — marketing home (prerendered), customer area,
               quotation flow, owner review screen
```

## Quick start

```sh
bun install
docker compose up -d        # local PostgreSQL
cp .env.dist .env           # then adjust OWNER_EMAILS / ADMIN_MAIL

bun run dev                 # api on :3000 (bun --watch) + client on :4200
```

The client dev server proxies `/auth`, `/bookings`, `/customers` and `/health`
to the API, so cookies work without CORS.

Full check (typecheck, tests, features, build):

```sh
bun run check
```

## Testing

| Command | What it covers |
| --- | --- |
| `bun run test` | pricing engine & booking aggregate (`packages/domain`), HTTP surface (`apps/api`: real sockets, real policy stack, in-memory adapters) |
| `bun run test:features` | the BDD suite in `packages/domain` (Cucumber, 23 scenarios) driving commands/queries and the auth service end to end |
| `bun test test/pg.test.ts` (in `apps/api`, needs `DATABASE_URL`) | migrations + event store + projections + auth store over real PostgreSQL |

## Architecture

Event-sourced **Booking** and **CustomerProfile** aggregates
(`decide`/`evolve` deciders); schema-typed **commands and queries** on a bus
with boundary validation, authorization, idempotency and tracing;
**projections** hydrate read models (`booking_view`, `customer_profile_view`)
and drive notifications and the automatic quotation generator (inbox-deduped,
live-gated so rebuilds never resend emails).

- **Credentials** live in `@structure-ai/auth` (password lifecycle, opaque
  cookie sessions, mandatory e-mail verification); the profile aggregate owns
  the booking-relevant customer data. Registration on the client = auth
  register, then profile save after sign-in.
- **Authorization**: a typed policy (customer/owner/system roles). The bus
  denies unmapped messages; row-level ownership is checked in the query
  handler. Anonymous dispatches are denied at the bus (403 `Unauthorized`).
- **Pricing**: the legacy algorithm is ported 1:1 (cent rounding included) and
  pinned by the BDD scenarios — see `packages/domain/src/booking/pricing.ts`.
- **Availability** is answered from the (eventually consistent) booking view;
  the read-side race is accepted and documented — the owner resolves any
  double-booking during validation.
- **Migrations**: the API process is the single designated migrator
  (event-store tables, view tables, auth tables), forward-only.

### API settings

The business settings (`BASE_URL`, `ADMIN_MAIL`, `OWNER_EMAILS`) are declared
in `packages/domain` and composed into the API's own settings — one env
contract, shared by every future host app.

| Name | Type | Required | Default | Secret | Description |
| --- | --- | --- | --- | --- | --- |
| HTTP_PORT | port | no | 3000 |  |  |
| DATABASE_URL | secret | yes |  | yes | PostgreSQL connection URL (event store, views, auth store) |
| BASE_URL | url | no | http://localhost:3000/ |  | public base URL of the API (auth links, tenant origins) |
| ADMIN_MAIL | string | yes |  |  | mailbox receiving internal notifications |
| OWNER_EMAILS | string | no |  |  | comma-separated emails granted the owner role at sign-in |
| FILES_DIR | string | no | ./var/files |  | base directory for generated quotations and uploaded documents |
| LOG_LEVEL | log-level | yes |  |  | minimum log level |
| LOG_FORMAT | "json" \| "pretty" | no | json |  | log output format |
| OTLP_URL | url | no |  |  | OTLP collector base URL; telemetry export is off when unset |

API docs: `/docs` (Swagger UI) and `/openapi.json`. The `/auth/*` routes are
the auth framework's Web handler mounted at the edge and are intentionally not
part of the generated OpenAPI spec; their contract is documented in
`@structure-ai/auth`.

## Notes & known trade-offs

- **`@structure-ai` 0.0.3 inter-dependencies** are published as a broken
  `0.0.0` spec; the root `package.json` pins the whole scope via `overrides`
  until the framework publishes consistent versions.
- **Rate limiter** is in-memory (`allowAllRateLimiter` in tests): honest for
  the current single-instance deployment; move to a shared store before
  scaling horizontally.
- **Quotation PDFs** are currently rendered as HTML (the legacy dompdf
  pipeline's input) behind a port; byte-true PDF rendering is a drop-in later.
- **`@effect/sql` Migrator bug**: its pg `ensureTable` aborts the migration
  transaction by probing with a deliberate error; the app pre-creates the
  bookkeeping table (idempotent) — see `apps/api/src/migrations.ts`.
- Mutations on `/auth/*` are origin-checked against the request origin; the
  client is deployed same-origin (or via proxy). Cross-origin deployments must
  configure `allowOrigin`.
