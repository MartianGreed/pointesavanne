<?php

namespace App\Domain\Booking\QuotationGeneration;

use App\Domain\Booking\Booking;
use App\Domain\Shared\PDF\File;

final class QuotationGenerationResponse
{
    public function __construct(public readonly Booking $booking, public readonly File $file)
    {
    }
}