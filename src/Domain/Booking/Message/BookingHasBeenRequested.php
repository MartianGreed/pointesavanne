<?php

namespace App\Domain\Booking\Message;

use App\Domain\Message;

final class BookingHasBeenRequested implements Message
{
    public function __construct(public readonly string $bookingId, public readonly string $from, public readonly string $to)
    {
    }
}