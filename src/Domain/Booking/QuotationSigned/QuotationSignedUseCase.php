<?php

namespace App\Domain\Booking\QuotationSigned;

use App\Domain\Booking\BookingRepository;
use App\Domain\Booking\Exception\BookingNotFoundException;
use App\Domain\FileLocator;
use App\Domain\Mailer;
use App\Domain\Shared\File\FileNotFoundException;

final class QuotationSignedUseCase
{
    public function __construct(
        private readonly BookingRepository $bookingRepository,
        private readonly FileLocator $locator,
        private readonly Mailer $mailer,
        private readonly string $ownerEmail
    )
    {
    }

    /**
     * @throws FileNotFoundException
     */
    public function execute(QuotationSignedRequest $request): QuotationSignedResponse
    {
        $booking = $this->bookingRepository->findBookingById($request->bookingId);
        if (null === $booking) {
            throw new BookingNotFoundException($request->bookingId->toString());
        }

        // Throwing FileNotFoundException if file does not exists
        $signedQuotation = $this->locator->locate($request->file->location);

        $booking->signQuotation($signedQuotation);

        $this->bookingRepository->save($booking);

        $dates = $booking->getFormattedBookingDates();
        $this->mailer->addMessage(QuotationSigned::new($this->ownerEmail, $dates->from, $dates->to, $booking->getCustomer()->getProfile()->getFullname()));
        $this->mailer->send();

        return new QuotationSignedResponse($booking, $signedQuotation);
    }
}