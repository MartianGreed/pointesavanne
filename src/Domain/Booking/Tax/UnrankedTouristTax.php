<?php

namespace App\Domain\Booking\Tax;

use App\Domain\Booking\Discount\DiscountAmount;
use App\Domain\Booking\Pricing\Price;

final class UnrankedTouristTax implements Tax
{
    private Price $amount;

    public function __construct(Price $totalAmount, int $totalOccupants, int $nightCount, int $adultsCount)
    {
        $pricePerNight = new Price(($totalAmount->amount / $nightCount) / $totalOccupants);
        $excludedTaxPrice = DiscountAmount::parse('2.5%')->apply($pricePerNight);
        $taxPrice = $pricePerNight->sub($excludedTaxPrice);

        // Unranked tax have a max amount of 2,35€
        if (235 < $taxPrice->getValue()) {
            $taxPrice = new Price(2.35);
        }

        $this->amount = new Price(($taxPrice->getValue() / 100) * $nightCount * $adultsCount);
    }

    public function getAmount(): Price
    {
        return $this->amount;
    }
}