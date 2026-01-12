import { Given, When } from '@cucumber/cucumber'
import { strict as assert } from 'node:assert'
import type { TestWorld } from '../world.ts'
import { QuotationGenerationRequest } from '../../../ts/domain/booking/quotation-generation/quotation-generation-request.ts'
import { QuotationSignedRequest } from '../../../ts/domain/booking/quotation-signed/quotation-signed-request.ts'
import { File } from '../../../ts/domain/shared/pdf/file.ts'

Given('quotation has been generated', async function (this: TestWorld) {
  assert.ok(this.booking, 'Booking should exist')
  const request = new QuotationGenerationRequest(this.booking.getId())
  this.quotationGenerationResponse = await this.quotationGenerationUseCase.execute(request)
  this.booking = this.quotationGenerationResponse.booking
  this.mailer.clearSent()
})

Given('the signed quotation is uploaded', function (this: TestWorld) {
  assert.ok(this.booking, 'Booking should exist')
  const bookingId = this.booking.getId().toString()
  const filePath = `booking/${bookingId}/devis-signed.pdf`
  this.fileLocator.addFile(filePath, `/full/path/${filePath}`)
})

When('customer has signed quotation', async function (this: TestWorld) {
  assert.ok(this.booking, 'Booking should exist')
  const bookingId = this.booking.getId()
  const signedFilePath = `booking/${bookingId.toString()}/devis-signed.pdf`
  const encoder = new TextEncoder()
  const file = new File(signedFilePath, encoder.encode('signed-content'), 'application/pdf')
  const request = new QuotationSignedRequest(bookingId, file)
  try {
    this.quotationSignedResponse = await this.quotationSignedUseCase.execute(request)
    this.booking = this.quotationSignedResponse.booking
  } catch (e) {
    this.executeException = e as Error
  }
})
