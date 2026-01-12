import type { Message } from '../../shared/message.ts'

export class BookingHasBeenRequested implements Message {
  constructor(
    public readonly bookingId: string,
    public readonly from: string,
    public readonly to: string
  ) {}
}
