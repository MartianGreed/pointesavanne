import { EventRegistry } from "@structure-ai/eventsourcing"
import { eventRegistryEntries, type BookingEvent } from "./booking/booking.ts"
import { leadEventRegistryEntries, type LeadEvent } from "./lead/lead.ts"
import { profileEventRegistryEntries, type ProfileEvent } from "./customer/profile.ts"

export type AppEvent = BookingEvent | ProfileEvent | LeadEvent

/** Booking events only — the Booking aggregate's store. */
export const bookingRegistry = EventRegistry.make(eventRegistryEntries)

/** Profile events only — the CustomerProfile aggregate's store. */
export const profileRegistry = EventRegistry.make(profileEventRegistryEntries)

/** Lead events only — the QuotationLead aggregate's store. */
export const leadRegistry = EventRegistry.make(leadEventRegistryEntries)

/** Every event, for projections reading the global feed. */
export const registry = EventRegistry.make([
  ...eventRegistryEntries,
  ...profileEventRegistryEntries,
  ...leadEventRegistryEntries,
])
