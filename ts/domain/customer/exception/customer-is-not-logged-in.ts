export class CustomerIsNotLoggedInException extends Error {
  constructor() {
    super('Customer is not logged in')
    this.name = 'CustomerIsNotLoggedInException'
  }
}
