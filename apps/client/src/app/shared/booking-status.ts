import type { TextTranslationKey } from '../core/translations/fr';

/** Presentation helpers shared by the customer area and the owner console. */

export interface BookingStatusStyle {
  readonly labelKey: TextTranslationKey;
  readonly bg: string;
  readonly color: string;
  /** The "prochain pas" hint shown on a reservation card. */
  readonly nextStepKey: TextTranslationKey;
}

/** Maps API booking statuses onto the design's status palette and wording. */
export const BOOKING_STATUS_STYLES: Record<string, BookingStatusStyle> = {
  'quotation-requested': {
    labelKey: 'booking.status.requested.label',
    bg: '#F7E7CF',
    color: '#8A5A1B',
    nextStepKey: 'booking.status.requested.nextStep',
  },
  'quotation-awaiting-acceptation': {
    labelKey: 'booking.status.awaitingAcceptance.label',
    bg: '#E7EEF7',
    color: '#2C517E',
    nextStepKey: 'booking.status.awaitingAcceptance.nextStep',
  },
  'quotation-signed': {
    labelKey: 'booking.status.signed.label',
    bg: '#EAF0EA',
    color: '#1E4436',
    nextStepKey: 'booking.status.signed.nextStep',
  },
  'contract-sent': {
    labelKey: 'booking.status.confirmed.label',
    bg: '#1E4436',
    color: '#FFFFFF',
    nextStepKey: 'booking.status.confirmed.nextStep',
  },
};

export const statusStyle = (status: string): BookingStatusStyle =>
  BOOKING_STATUS_STYLES[status] ?? {
    labelKey: 'booking.status.unknown.label',
    bg: '#EFEDE8',
    color: '#7A7468',
    nextStepKey: 'booking.status.unknown.nextStep',
  };
