<?php

namespace App\Domain\Booking\Tax;

use App\Domain\Booking\Pricing\Price;
use DateTime;

final class RankedTouristTax implements Tax
{
    private const UNIT_AMOUNT = 1.5;

    private Price $amount;

    public function __construct(DateTime $from, DateTime $to, int $adultsCount)
    {
        $this->amount = new Price(($from->diff($to)->days * $adultsCount) * self::UNIT_AMOUNT);
    }

    public function getAmount(): Price
    {
        return $this->amount;
    }
}