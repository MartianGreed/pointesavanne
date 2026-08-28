import { EventRegistry } from "@structure-ai/eventsourcing"
import { eventRegistryEntries, type BookingEvent } from "./booking/booking.ts"
import { profileEventRegistryEntries, type ProfileEvent } from "./customer/profile.ts"

export type AppEvent = BookingEvent | ProfileEvent

/** Booking events only — the Booking aggregate's store. */
export const bookingRegistry = EventRegistry.make(eventRegistryEntries)

/** Profile events only — the CustomerProfile aggregate's store. */
export const profileRegistry = EventRegistry.make(profileEventRegistryEntries)

/** Every event, for projections reading the global feed. */
export const registry = EventRegistry.make([...eventRegistryEntries, ...profileEventRegistryEntries])
