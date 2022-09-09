<?php

namespace App\Domain\Booking\Discount;

final class Discount
{
    /** @var Range[]  */
    private array $ranges;

    public function addRange(Range $range): Discount
    {
        $this->ranges[] = $range;
        return $this;
    }

    public function getDiscountForDuration(int $currentNight): ?Range
    {
        foreach ($this->ranges as $range) {
            if ($currentNight < $range->from || $currentNight > $range->to) {
                continue;
            }
            return $range;
        }

        return null;
    }
}