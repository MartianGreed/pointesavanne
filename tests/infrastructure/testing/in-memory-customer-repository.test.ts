import { test, expect } from 'bun:test'
import { InMemoryCustomerRepository } from '../../../ts/infrastructure/testing/in-memory-customer-repository.ts'
import { Customer } from '../../../ts/domain/customer/customer.ts'
import { CustomerId } from '../../../ts/domain/customer/customer-id.ts'
import { Email } from '../../../ts/domain/customer/email.ts'

test('InMemoryCustomerRepository starts empty', async () => {
  const repo = new InMemoryCustomerRepository()
  expect(await repo.doesCustomerWithEmailExists('test@example.com')).toBe(false)
})

test('InMemoryCustomerRepository saves and finds customer', async () => {
  const repo = new InMemoryCustomerRepository()
  const email = new Email('test@example.com')
  const customer = Customer.register(
    CustomerId.build(),
    email,
    'encoded_password',
    '0612345678',
    'John',
    'Doe'
  )

  await repo.saveCustomer(customer)

  expect(await repo.doesCustomerWithEmailExists('test@example.com')).toBe(true)
  const found = await repo.findCustomerByEmail(email)
  expect(found).not.toBeNull()
  expect(found?.getEmail()).toBe('test@example.com')
})

test('InMemoryCustomerRepository returns null for non-existent customer', async () => {
  const repo = new InMemoryCustomerRepository()
  const email = new Email('notfound@example.com')
  const found = await repo.findCustomerByEmail(email)
  expect(found).toBeNull()
})
