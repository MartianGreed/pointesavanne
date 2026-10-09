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
                apps: booking, quotation-lead and profile aggregates, pricing
                engine, villa catalog, message contracts, access policy,
                handlers, views & projections, ports (mailer, files,
                quotation PDF, auth), in-memory test composition, feature
                suite on @structure-ai/bdd
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
# optional: .env.local overrides .env per key, for personal local values

bun run dev                 # api on :3000 (bun --watch) + client on :4200
```

The client dev server proxies `/auth`, `/bookings`, `/customers` and `/health`
to the API, so cookies work without CORS.

Full check (typecheck, tests, features, build):

```sh
bun run check
```

### Contremaitre

On a Mac with Contremaitre and its native runtime installed, run these commands
from the checkout you want to preview:

```sh
contremaitre ensure --json
contremaitre verify --profile smoke --json
contremaitre report --json
```

The report gives the local HTTPS client and API URLs. Contremaitre runs the
existing Bun/Turbo development runner with Node 26 for Angular, managed
PostgreSQL and a persistent volume for quotations and uploaded documents.
The client proxies API requests within the same container. `BASE_URL` uses the
client's HTTPS origin for auth links and passkeys.

The manifest loads `.env.dist` for development defaults. To use personal values,
change `env_file` to `.env` or `[.env, .env.local]` after creating those files in
that checkout. Explicit manifest settings override the env files.

The smoke profile checks the rendered page, API documentation, same-origin auth
and booking proxies, database connectivity and migrations. Run the full
typecheck, unit, HTTP, PostgreSQL, BDD and build checks with:

```sh
contremaitre verify --profile check --json
```

This profile runs tasks one at a time and creates and removes a temporary database
so the PostgreSQL tests' table cleanup cannot affect preview data. It runs every
check even if an earlier check fails, and returns a failure if any check fails.
Both configuration files,
`.contremaitre.yaml` and `.contremaitre.lock`, belong in version control.

## Testing

| Command | What it covers |
| --- | --- |
| `bun run test` | pricing engine & booking aggregate (`packages/domain`), HTTP surface (`apps/api`: real sockets, real policy stack, in-memory adapters) |
| `bun run test:features` | the BDD suite in `packages/domain` (`@structure-ai/bdd` on `bun test`, 28 scenarios) driving commands/queries and the auth service end to end |
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
  register → e-mail verification → sign-in; nothing is lost in between: the
  devis intent submitted before the account exists is a server-side
  **quotation lead**, claimed automatically at the first sign-in.
- **Conversion funnel**: an anonymous "Demander mon devis" persists a
  `QuotationLead` (event-sourced, keyed by the normalized e-mail — one
  unclaimed lead per address, the newest submission wins). `ClaimQuotationLeads`
  (dispatched by the client right after every sign-in, the e-mail derived
  from the session — never from a payload) fills an absent profile from the
  lead's contact and creates the booking request through the same
  orchestration as `RequestQuotation`; the lead is claimed *before* the
  booking is created, so a concurrent claim is a no-op rather than a double
  booking, and a booking that cannot be created (dates since taken) is
  reported as an issue on a consumed lead. The client keeps only an in-memory
  Angular store (`QuoteFunnelStore`) for same-session prefill — no browser
  storage: the backend is the source of truth, and nothing (PII included)
  outlives the tab or the session (sign-out wipes the store).
- **Authorization**: a typed policy (customer/owner/system roles). The bus
  denies unmapped messages; row-level ownership is checked in the query
  handler. Anonymous dispatches are denied at the bus (403 `Unauthorized`)
  except the public funnel messages (availability check, quotation-lead
  submission), and the lead claim requires a session.
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

API docs: `/docs` (Swagger UI) and `/openapi.json`. Business failures a
message declares in its `failure` schema surface as typed **422** responses
(the `@structure-ai` 0.0.4 bridge contract) — e.g. another customer reading
a booking gets `422 PermissionDenied`; bus-level denials stay 403 problems.
The `/auth/*` routes are
the auth framework's Web handler mounted at the edge and are intentionally not
part of the generated OpenAPI spec; their contract is documented in
`@structure-ai/auth`.

## Notes & known trade-offs

- **`@structure-ai`** packages are pinned to `0.4.1`; the framework now
  publishes matching internal dependency versions without root overrides.
- **Rate limiter** is in-memory (`allowAllRateLimiter` in tests): honest for
  the current single-instance deployment; move to a shared store before
  scaling horizontally.
- **Quotation PDFs** are currently rendered as HTML (the legacy dompdf
  pipeline's input) behind a port; byte-true PDF rendering is a drop-in later.
  The download endpoints (`GET /bookings/{id}/quotation`,
  `GET /bookings/{id}/signed-document`) sniff the stored bytes: real PDFs are
  served as `application/pdf`, the HTML interim renders inline.
- **`@effect/sql` Migrator bug**: its pg `ensureTable` aborts the migration
  transaction by probing with a deliberate error; the app pre-creates the
  bookkeeping table (idempotent) — see `apps/api/src/migrations.ts`.
- Mutations on `/auth/*` are origin-checked against the request origin; the
  client is deployed same-origin (or via proxy). Cross-origin deployments must
  configure `allowOrigin`.
