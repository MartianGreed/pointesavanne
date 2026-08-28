import { makeSet } from "@structure-ai/migrations"
import { ViewModel } from "@structure-ai/viewmodel"
import { BookingView, CustomerProfileView } from "./views.ts"

/**
 * View-table migrations for the domain's read models. Host applications own
 * the full production migration set (event-store tables, view tables,
 * bookkeeping) and compose these entries with their storage choices — see
 * apps/api/src/migrations.ts.
 */
export const viewMigrations = makeSet([ViewModel.migration(BookingView, 1), ViewModel.migration(CustomerProfileView, 2)])
