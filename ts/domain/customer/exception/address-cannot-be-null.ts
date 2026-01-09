export class AddressCannotBeNullException extends Error {
  constructor() {
    super('Address cannot be null')
    this.name = 'AddressCannotBeNullException'
  }
}
