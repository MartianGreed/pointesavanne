<?php

namespace App\Domain\Booking\Quotation;

use App\Domain\Booking\Booking;

final class QuotationResponse
{
    public function __construct(
        public readonly Booking $booking
    )
    {
    }
}