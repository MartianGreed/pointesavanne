<?php

namespace App\Domain\Booking\Discount;

use App\Domain\Booking\Pricing\Price;

interface DiscountApplier
{
    public function apply(DiscountAmount $amount, Price $price): Price;
}