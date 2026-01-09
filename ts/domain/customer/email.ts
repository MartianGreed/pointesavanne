export class Email {
  private readonly value: string

  constructor(email: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      throw new Error('Email is not properly formatted')
    }
    this.value = email
  }

  getValue(): string {
    return this.value
  }

  toString(): string {
    return this.value
  }
}
