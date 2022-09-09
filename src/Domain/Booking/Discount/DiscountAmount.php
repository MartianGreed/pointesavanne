<?php

namespace App\Domain\Booking\Discount;

use App\Domain\Booking\Pricing\Price;

final class DiscountAmount
{
    public function __construct(public readonly float $advantageValue, public readonly string $advantageType)
    {
    }

    public static function parse(string $value): self
    {
        $amountMatches = [];
        preg_match('/\d+([., ]\d+)?/', $value, $amountMatches);
        $amount = (float) str_replace(' ', '', array_shift($amountMatches));
        $type = str_replace([' ', $amount], '', $value);

        return new self($amount, $type);
    }

    public function apply(Price $price): Price
    {
        return $this->getApplier()->apply($this, $price);
    }

    private function getApplier(): DiscountApplier
    {
        return match ($this->advantageType) {
            '%' => new PercentApplier(),
            default => new FlatApplier(),
        };
    }
}