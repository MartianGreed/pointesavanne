<?php

namespace App\Domain\Booking\Pricing;

final class Range
{
    public function __construct(
        public readonly \DateTime $from,
        public readonly \DateTime $to,
        public readonly Price $price
    )
    {
    }
}