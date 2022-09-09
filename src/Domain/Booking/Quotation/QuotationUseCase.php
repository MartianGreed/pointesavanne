<?php

namespace App\Domain\Booking\Quotation;

use App\Domain\AsyncMessage;
use App\Domain\Booking\Booking;
use App\Domain\Booking\BookingId;
use App\Domain\Booking\BookingRepository;
use App\Domain\Booking\Exception\BookingUnavailableException;
use App\Domain\Booking\Message\BookingHasBeenRequested;
use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Mailer;
use App\Domain\UuidGenerator;

final class QuotationUseCase
{
    public function __construct(
        private readonly BookingRepository $bookingRepository,
        private readonly AuthenticationGateway $authenticationGateway,
        private readonly Mailer $mailer,
        private readonly AsyncMessage $asyncMessage,
        private readonly string $adminMail
    )
    {
    }

    public function execute(QuotationRequest $request): QuotationResponse
    {
        $customer = $this->authenticationGateway->getCurrentLoggedInCustomer();

        $booking = Booking::request(BookingId::build(), $request->villa, $customer, $request->from, $request->to, $request->adultsCount, $request->childrenCount);
        $bookingDates = $booking->getFormattedBookingDates();
        if (!$this->bookingRepository->isBookingAvailable($bookingDates)) {
            throw new BookingUnavailableException($bookingDates);
        }

        $booking->createPricingContext();

        $this->bookingRepository->save($booking);

        $params = [
            'bookingId' => $booking->getId(),
            'from' => $bookingDates->from,
            'to' => $bookingDates->to
        ];

        $this->mailer->addMessage(NewQuotationRequest::new($this->adminMail, $params));
        $this->mailer->addMessage(QuotationRequestHasBeenSent::new($customer->getEmail(), $params));

        $this->asyncMessage->dispatch(new BookingHasBeenRequested($booking->getId(), $bookingDates->from, $bookingDates->to));
        $this->mailer->send();

        return new QuotationResponse($booking);
    }
}