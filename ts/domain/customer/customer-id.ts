import { Uuid } from '../shared/uuid.ts'
import { UuidGenerator } from '../shared/uuid-generator.ts'

export class CustomerId extends Uuid {
  private constructor(value: string) {
    super(value)
  }

  static build(): CustomerId {
    return new CustomerId(UuidGenerator.v4())
  }

  static fromString(value: string): CustomerId {
    return new CustomerId(value)
  }
}
