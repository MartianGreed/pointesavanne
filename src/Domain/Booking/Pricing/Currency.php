<?php

namespace App\Domain\Booking\Pricing;

abstract class Currency
{
    public function __construct(
        public readonly string $symbol,
        public readonly string $value,
    )
    {
    }

    public function __toString(): string
    {
        return $this->symbol;
    }
}