<?php

namespace App\Domain\Booking\Discount;

final class Range
{
    public function __construct(
        public readonly int $from,
        public readonly int $to,
        public readonly DiscountAmount $amount
    )
    {
    }
}