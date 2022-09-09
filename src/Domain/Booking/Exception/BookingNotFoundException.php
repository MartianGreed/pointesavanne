<?php

namespace App\Domain\Booking\Exception;

final class BookingNotFoundException extends \DomainException
{
    public function __construct(string $bookingId)
    {
        parent::__construct(sprintf('Booking not found for id : %s', $bookingId));
    }
}