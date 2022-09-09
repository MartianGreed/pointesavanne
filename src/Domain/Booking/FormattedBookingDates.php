<?php

namespace App\Domain\Booking;

final class FormattedBookingDates
{
    public function __construct(
        public readonly string $from,
        public readonly string $to
    )
    {}
}