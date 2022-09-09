<?php

namespace App\Domain\Booking;

use App\Domain\Booking\Pricing\Price;
use App\Domain\Booking\Pricing\Range;
use App\Domain\Shared\DateUtils;

final class Villa
{
    private Pricing\PriceRange $priceRange;
    private Discount\Discount $discount;

    public function __construct(private string $name, private Price $caution, private Price $household)
    {
    }

    public function getDepositAmount(): Price
    {
        return $this->caution;
    }

    public function setPriceRange(Pricing\PriceRange $priceRange): self
    {
        $this->priceRange = $priceRange;
        return $this;
    }

    public function setDiscount(Discount\Discount $discount): self
    {
        $this->discount = $discount;
        return $this;
    }

    /** @return array<int, Range|null>  */
    public function getPricesForPeriod(\DateTime $from, \DateTime $to)
    {
        $rangeStart = null;
        $rangeEnd = null;

        /** @var Range $range */
        foreach ($this->priceRange->getIterator() as $range) {
            if (DateUtils::isWithin($from, $range->from, $range->to)) {
                $rangeStart = $range;
            }

            if (DateUtils::isWithin($to, $range->from, $range->to)) {
                $rangeEnd = $range;
            }
        }

        return [$rangeStart, $rangeEnd];
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function getDiscount(): Discount\Discount
    {
        return $this->discount;
    }

    public function getHouseholdAmount(): Price
    {
        return $this->household;
    }
}