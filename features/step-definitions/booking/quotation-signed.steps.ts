import { Given, When, Then } from '@cucumber/cucumber'
import { strict as assert } from 'assert'
import type { TestWorld } from '../../support/world.ts'
import { QuotationSignedRequest } from '../../../ts/domain/booking/quotation-signed/quotation-signed-request.ts'
import { BookingId } from '../../../ts/domain/booking/booking-id.ts'
import { File } from '../../../ts/domain/shared/pdf/file.ts'

Given('the signed quotation is uploaded', async function (this: TestWorld) {
  assert.ok(this.quotationGenerationResponse, 'Quotation generation response must exist')
  const bookingId = this.quotationGenerationResponse.booking.getId()
  const filename = `booking/${bookingId}/devis_signed.pdf`
  this.addUploadedFile(filename)
})

When('customer has signed quotation', async function (this: TestWorld) {
  let bookingId: string

  if (this.quotationGenerationResponse) {
    bookingId = this.quotationGenerationResponse.booking.getId()
  } else if (this.quotationResponse) {
    bookingId = this.quotationResponse.booking.getId()
  } else {
    throw new Error('No quotation response available')
  }

  const filename = `booking/${bookingId}/devis_signed.pdf`
  const file = new File(filename, new Uint8Array(0), 'application/pdf')
  const request = new QuotationSignedRequest(BookingId.fromString(bookingId), file)

  try {
    this.quotationSignedResponse = await this.quotationSignedUseCase.execute(request)
  } catch (e) {
    this.executeException = e as Error
  }
})
