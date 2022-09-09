<?php

namespace App\Domain\Booking\QuotationSigned;

use App\Domain\Booking\Booking;
use App\Domain\Shared\PDF\File;

final class QuotationSignedResponse
{
    public function __construct(public readonly Booking $booking, public readonly File $signedQuotation)
    {
    }
}