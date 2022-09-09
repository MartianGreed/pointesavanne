<?php

namespace App\Domain\Booking\Quotation;

use App\Domain\Booking\Villa;

final class QuotationRequest
{
    public function __construct(
        public readonly Villa $villa,
        public readonly \DateTime $from,
        public readonly \DateTime $to,
        public readonly int $adultsCount,
        public readonly int $childrenCount = 0,
    )
    {
    }
}