/** Presentation helpers shared by the customer area and the owner console. */

export interface BookingStatusStyle {
  readonly label: string
  readonly bg: string
  readonly color: string
  /** The "prochain pas" hint shown on a reservation card. */
  readonly nextStep: string
}

/** Maps API booking statuses onto the design's status palette and wording. */
export const BOOKING_STATUS_STYLES: Record<string, BookingStatusStyle> = {
  "quotation-requested": {
    label: "Nouvelle demande",
    bg: "#F7E7CF",
    color: "#8A5A1B",
    nextStep: "Votre demande a bien été reçue. Le propriétaire prépare votre devis : vous le recevrez ici et par e-mail sous 24 h.",
  },
  "quotation-awaiting-acceptation": {
    label: "Devis envoyé",
    bg: "#E7EEF7",
    color: "#2C517E",
    nextStep: "Votre devis est prêt. Signez le devis reçu par e-mail puis téléversez-le ici pour que le propriétaire puisse valider votre réservation.",
  },
  "quotation-signed": {
    label: "Devis signé",
    bg: "#EAF0EA",
    color: "#1E4436",
    nextStep: "Devis signé. Le propriétaire valide votre réservation : vous recevrez la confirmation très prochainement.",
  },
  "contract-sent": {
    label: "Confirmée",
    bg: "#1E4436",
    color: "#FFFFFF",
    nextStep: "Réservation confirmée. Les informations d'arrivée vous seront envoyées une semaine avant le séjour.",
  },
}

export const statusStyle = (status: string): BookingStatusStyle =>
  BOOKING_STATUS_STYLES[status] ?? { label: status, bg: "#EFEDE8", color: "#7A7468", nextStep: "" }

/** "12 juin 2025" — the long format used across the customer area. */
export const longDate = (isoDay: string): string =>
  new Date(`${isoDay}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })

/** "12 juin 2025" with a short month — the owner table format. */
export const shortDate = (isoDay: string): string =>
  new Date(`${isoDay}T12:00:00`).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })
