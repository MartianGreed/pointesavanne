<?php

namespace App\Domain\Booking\Pricing;

use App\Domain\Booking\Exception\OverlappingPriceRangeException;
use ArrayIterator;
use Iterator;

final class PriceRange
{
    /** @var Range[]  */
    private array $ranges = [];

    public function addRange(Range $range): self
    {
        if ($this->isOverlapping($range)) {
            throw new OverlappingPriceRangeException($range);
        }

        $this->ranges[] = $range;
        return $this;
    }

    private function isOverlapping(Range $range): bool
    {
        return false;
    }

    public function getIterator(): Iterator
    {
        return new ArrayIterator($this->ranges);
    }
}