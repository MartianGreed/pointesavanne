import { CustomerId } from './customer-id.ts'
import { Email } from './email.ts'
import { Profile } from './profile.ts'
import { Address } from './address.ts'
import { Roles } from './roles.ts'
import { RecoverPassword } from './recover-password.ts'

const FRENCH_PHONE_REGEX =
  /^(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})$/

export class Customer {
  private id!: CustomerId
  private email!: Email
  private password: string | null = null
  private profile!: Profile
  private address: Address | null = null
  private roles!: Roles
  private recoverPasswordRequest: RecoverPassword | null = null
  private createdAt!: Date
  private updatedAt!: Date
  private lastLoginAt: Date | null = null

  private constructor() {
    this.lastLoginAt = null
  }

  static register(
    id: CustomerId,
    email: Email,
    password: string,
    phoneNumber: string,
    firstname: string,
    lastname: string
  ): Customer {
    if (!FRENCH_PHONE_REGEX.test(phoneNumber)) {
      throw new Error('Invalid phone number format')
    }

    const customer = new Customer()
    customer.id = id
    customer.email = email
    customer.password = password
    customer.profile = new Profile(firstname, lastname, phoneNumber)
    customer.roles = Roles.default()

    const registrationDate = new Date()
    customer.createdAt = registrationDate
    customer.updatedAt = registrationDate

    return customer
  }

  logIn(): this {
    this.lastLoginAt = new Date()
    return this
  }

  updateProfile(
    address: Address | null = null,
    firstname: string | null = null,
    lastname: string | null = null,
    phoneNumber: string | null = null,
    language: string | null = null
  ): this {
    if (firstname !== null && firstname !== this.profile.getFirstname()) {
      this.profile.setFirstname(firstname)
    }

    if (lastname !== null && lastname !== this.profile.getLastname()) {
      this.profile.setLastname(lastname)
    }

    if (phoneNumber !== null && phoneNumber !== this.profile.getPhoneNumber()) {
      this.profile.setPhoneNumber(phoneNumber)
    }

    if (language !== null && language !== this.profile.getLanguage()) {
      this.profile.setLanguage(language)
    }

    if (address !== null) {
      this.address = address
    }

    this.updatedAt = new Date()
    return this
  }

  recoverPassword(token: string | null = null): void {
    this.recoverPasswordRequest = RecoverPassword.recordNow(token)
  }

  updatePassword(encoded: string): this {
    this.password = encoded
    this.updatedAt = new Date()
    this.recoverPasswordRequest = null
    return this
  }

  getId(): CustomerId {
    return this.id
  }

  getRoles(): Roles {
    return this.roles
  }

  getRecoverPasswordRequest(): RecoverPassword | null {
    return this.recoverPasswordRequest
  }

  getCreatedAt(): Date {
    return this.createdAt
  }

  getUpdatedAt(): Date {
    return this.updatedAt
  }

  getLastLoginAt(): Date | null {
    return this.lastLoginAt
  }

  getEmail(): string {
    return this.email.toString()
  }

  getPassword(): string | null {
    return this.password
  }

  getProfile(): Profile {
    return this.profile
  }

  getRecoverPassword(): RecoverPassword | null {
    return this.recoverPasswordRequest
  }

  getAddress(): Address | null {
    return this.address
  }
}
