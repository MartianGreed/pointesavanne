import type { Customer } from '../customer.ts'
import type { Email } from '../email.ts'

export interface PasswordUpdater {
  updateFromRequest(request: UpdatePasswordRequestData): Promise<Customer>
}

export interface UpdatePasswordRequestData {
  email: Email | null
  oldPassword: string | null
  newPassword: string | null
  token: string | null
}
