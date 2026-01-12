export class Roles {
  private constructor(private readonly value: string[]) {}

  static default(): Roles {
    return new Roles(['ROLE_USER'])
  }

  static admin(): Roles {
    return new Roles(['ROLE_USER', 'ROLE_ADMIN'])
  }

  getRoles(): string[] {
    return this.value
  }
}
