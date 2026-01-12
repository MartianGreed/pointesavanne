export class InvalidUpdatePasswordRequestException extends Error {
  constructor() {
    super('Invalid update password request')
    this.name = 'InvalidUpdatePasswordRequestException'
  }
}
