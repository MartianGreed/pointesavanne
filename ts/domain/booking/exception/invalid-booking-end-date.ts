export class InvalidBookingEndDateException extends Error {
  constructor(from: string, to: string) {
    super(`End date ${to} cannot be before start date ${from}`)
    this.name = 'InvalidBookingEndDateException'
  }
}
