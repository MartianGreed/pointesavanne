<?php

namespace App\Domain\Booking\Discount;

use App\Domain\Booking\Pricing\Price;

final class PercentApplier implements DiscountApplier
{
    public function apply(DiscountAmount $amount, Price $price): Price
    {
        $discountAmount = new Price((($amount->advantageValue / 100) * $price->getValue()) / 100);
        return $price->sub($discountAmount);
    }
}