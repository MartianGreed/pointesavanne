import { Given, When } from '@cucumber/cucumber'
import type { TestWorld } from '../../support/world.ts'
import { QuotationSignedRequest } from '../../../ts/domain/booking/quotation-signed/quotation-signed-request.ts'
import { BookingId } from '../../../ts/domain/booking/booking-id.ts'
import { File } from '../../../ts/domain/shared/pdf/file.ts'
import { QuotationDTO } from '../../../ts/domain/booking/quotation/quotation-dto.ts'

Given('the signed quotation is uploaded', async function (this: TestWorld) {
  const bookingId = this.backgroundBooking!.getId()
  const quotationDto = QuotationDTO.fromBooking(this.backgroundBooking!, 1)
  const content = new TextEncoder().encode(JSON.stringify(quotationDto))
  const file = new File(`booking/${bookingId}/devis-signe.pdf`, content, 'application/pdf')
  await this.fileLocator.save(file.name, file.content)
})

When('customer has signed quotation', async function (this: TestWorld) {
  const bookingId = this.backgroundBooking!.getId()

  try {
    this.quotationSignedResponse = await this.quotationSignedUseCase.execute(
      new QuotationSignedRequest(
        BookingId.fromString(bookingId),
        new File(`booking/${bookingId}/devis-signe.pdf`, new Uint8Array(), 'application/pdf')
      )
    )
    this.booking = this.quotationSignedResponse.booking
  } catch (e) {
    this.executeException = e as Error
  }
})
