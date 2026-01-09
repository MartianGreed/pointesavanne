import { Status } from './status.ts'

export class Transition {
  constructor(
    public readonly from: Status,
    public readonly to: Status,
    public readonly occuredAt: Date
  ) {}
}
