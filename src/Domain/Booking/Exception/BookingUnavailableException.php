<?php

namespace App\Domain\Booking\Exception;

use App\Domain\Booking\FormattedBookingDates;

final class BookingUnavailableException extends \DomainException
{
    public function __construct(FormattedBookingDates $bookingDates)
    {
        parent::__construct(sprintf('Booking is not available from %s to %s', $bookingDates->from, $bookingDates->to));
    }
}