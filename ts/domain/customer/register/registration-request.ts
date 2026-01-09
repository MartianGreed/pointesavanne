import { Email } from '../email.ts'

const FRENCH_PHONE_REGEX =
  /^(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})$/

export class RegistrationRequest {
  public readonly email: Email

  constructor(
    email: string,
    public readonly password: string,
    public readonly phoneNumber: string,
    public readonly firstname: string,
    public readonly lastname: string
  ) {
    this.email = new Email(email)

    if (this.password.length < 8) {
      throw new Error('Password is too short. Password has to be 8 chars min')
    }

    if (!FRENCH_PHONE_REGEX.test(this.phoneNumber)) {
      throw new Error('Invalid phone number format')
    }
  }
}
