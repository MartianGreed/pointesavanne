<?php

namespace App\Domain\Booking\Discount;

use App\Domain\Booking\Pricing\Price;

final class FlatApplier implements DiscountApplier
{
    public function apply(DiscountAmount $amount, Price $price): Price
    {
        return $price->sub(new Price($amount->advantageValue));
    }
}