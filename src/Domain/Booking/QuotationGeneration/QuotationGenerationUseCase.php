<?php

namespace App\Domain\Booking\QuotationGeneration;

use App\Domain\Booking\BookingRepository;
use App\Domain\Booking\Exception\BookingNotFoundException;
use App\Domain\Booking\Quotation\QuotationDTO;
use App\Domain\Booking\QuotationNumericIdGenerator;
use App\Domain\Mailer;
use App\Domain\Shared\PDF\PDFGenerator;

final class QuotationGenerationUseCase
{
    public function __construct(
        private readonly BookingRepository $bookingRepository,
        private readonly PDFGenerator $PDFGenerator,
        private readonly QuotationNumericIdGenerator $quotationNumericIdGenerator,
        private readonly Mailer $mailer,
    )
    {
    }

    public function execute(QuotationGenerationRequest $request): QuotationGenerationResponse
    {
        $booking = $this->bookingRepository->findBookingById($request->bookingId);
        if (null === $booking) {
            throw new BookingNotFoundException($request->bookingId->toString());
        }

        $file = $this->PDFGenerator->generate(
            QuotationPDF::generate(
                $booking->getId(),
                QuotationDTO::fromBooking($booking, $this->quotationNumericIdGenerator->generateQuotationId())
            )
        );

        $booking->awaitQuotationAcceptance($file);

        $this->bookingRepository->save($booking);
        $this->mailer->addMessage(
            QuotationHasBeenGenerated::new(
                $booking->getCustomer()->getEmail(),
                [
                    'location' => $file->location,
                ]
            )
        );

        $this->mailer->send();

        return new QuotationGenerationResponse($booking, $file);
    }
}