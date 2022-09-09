<?php

namespace App\Domain\Booking\QuotationSigned;

use App\Domain\Booking\BookingId;
use App\Domain\Shared\PDF\File;

final class QuotationSignedRequest
{
    public function __construct(
        public readonly BookingId $bookingId,
        public readonly File $file,
    )
    {
    }
}