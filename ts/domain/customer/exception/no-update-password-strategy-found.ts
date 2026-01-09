export class NoUpdatePasswordStrategyFound extends Error {
  constructor() {
    super('No update password strategy found')
    this.name = 'NoUpdatePasswordStrategyFound'
  }
}
