import { makeSet, defineMigration } from "@structure-ai/migrations"
import * as SqlClient from "@effect/sql/SqlClient"
import type { SqlError } from "@effect/sql/SqlError"
import { Effect, Layer } from "effect"
import { migrate as migrateEventStorePg } from "@structure-ai/eventsourcing-pg"
import { ViewModel } from "@structure-ai/viewmodel"
import { BookingView, CustomerProfileView } from "@pointesavanne/domain"

/**
 * Forward-only migrations. The API process is the single designated migrator
 * (single-instance deployment): it owns the event-store tables, the view
 * tables and the auth tables (the auth-pg migration runs separately in the
 * auth composition — it is idempotent and transactional on its own).
 */
export const prodMigrations = makeSet([
  defineMigration(1, "event_store_tables", migrateEventStorePg({ tablePrefix: "es_" })),
  ViewModel.migration(BookingView, 2),
  ViewModel.migration(CustomerProfileView, 3),
])

/**
 * Pre-creates the migrations bookkeeping table. The @effect/sql Migrator's
 * pg path probes for the table with a deliberate error inside the runner's
 * transaction, which aborts it before its own CREATE TABLE can run — so the
 * table must already exist (idempotent, same shape the Migrator expects).
 */
export const bookkeepingTable = (table = "effect_sql_migrations"): Layer.Layer<never, SqlError, SqlClient.SqlClient> =>
  Layer.effectDiscard(
    Effect.flatMap(SqlClient.SqlClient, (sql) => sql`
      CREATE TABLE IF NOT EXISTS ${sql(table)} (
        migration_id integer primary key,
        created_at timestamp with time zone not null default now(),
        name text not null
      )
    `),
  )
