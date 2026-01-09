export class Profile {
  constructor(
    private firstname: string,
    private lastname: string,
    private phoneNumber: string,
    private language: string | null = null
  ) {}

  getFirstname(): string {
    return this.firstname
  }

  getLastname(): string {
    return this.lastname
  }

  getPhoneNumber(): string {
    return this.phoneNumber
  }

  getLanguage(): string | null {
    return this.language
  }

  setFirstname(firstname: string): void {
    this.firstname = firstname
  }

  setLastname(lastname: string): void {
    this.lastname = lastname
  }

  setPhoneNumber(phoneNumber: string): void {
    this.phoneNumber = phoneNumber
  }

  setLanguage(language: string): void {
    this.language = language
  }

  getFullname(): string {
    return `${this.firstname} ${this.lastname}`
  }
}
