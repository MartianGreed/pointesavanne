import { Uuid } from '../shared/uuid.ts'
import { UuidGenerator } from '../shared/uuid-generator.ts'

export class BookingId extends Uuid {
  private constructor(value: string) {
    super(value)
  }

  static build(): BookingId {
    return new BookingId(UuidGenerator.v4())
  }

  static fromString(value: string): BookingId {
    return new BookingId(value)
  }
}
