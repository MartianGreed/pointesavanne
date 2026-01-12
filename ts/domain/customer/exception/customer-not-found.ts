export class CustomerNotFoundException extends Error {
  constructor(identifier: string) {
    super(`Customer with identifier "${identifier}" not found`)
    this.name = 'CustomerNotFoundException'
  }
}
