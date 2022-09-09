<?php

namespace App\Domain\Booking\QuotationGeneration;

use App\Domain\Booking\BookingId;

final class QuotationGenerationRequest
{
    public function __construct(public readonly BookingId $bookingId) {}
}