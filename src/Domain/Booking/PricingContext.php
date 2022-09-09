<?php

namespace App\Domain\Booking;

use App\Domain\Booking\Discount\Discount;
use App\Domain\Booking\Pricing\Price;
use App\Domain\Booking\Pricing\Range;
use App\Domain\Booking\Tax\RankedTouristTax;
use App\Domain\Booking\Tax\UnrankedTouristTax;
use App\Domain\Shared\DateUtils;
use DateInterval;
use DateTime;

final class PricingContext
{
    private Villa $villa;
    private Range $rangeStart;
    private Range $rangeEnd;
    /** @var Price[]  */
    private array $prices;

    public static function create(Villa $villa, DateTime $from, DateTime $to): self
    {
        $context = new self();
        $context->villa = $villa;

        [$rangeStart, $rangeEnd] = $villa->getPricesForPeriod($from, $to);
        if (null === $rangeStart || null === $rangeEnd) {
            throw new \DomainException('Cannot create pricing context from null ranges');
        }

        $context->rangeStart = $rangeStart;
        $context->rangeEnd = $rangeEnd;

        $context->computePrices($from, $to);

        return $context;
    }

    /** @return Price[] */
    public function getPrices(): array
    {
        return $this->prices;
    }

    public function getTotalAmount(): Price
    {
        return array_reduce($this->prices, static fn (Price $sum, Price $price) => $sum->add($price), new Price(0));
    }

    public function getUnrankedTouristTax(DateTime $from, DateTime $to, int $totalOccupants, int $adultsCount): Price
    {
        return (new UnrankedTouristTax(
            $this->getTotalAmount(),
            $totalOccupants,
            (int)$from->diff($to)->days,
            $adultsCount)
        )->getAmount();
    }

    public function getRankedTouristTax(DateTime $from, DateTime $to, int $totalOccupants): Price
    {
        return (new RankedTouristTax($from, $to, $totalOccupants))->getAmount();
    }

    private function computePrices(DateTime $from, DateTime $to): void
    {
        $currentDate = clone $from;
        $discount = $this->villa->getDiscount();

        $rangeStartPrices = $this->computePricesForSingleRange($from, $to, $currentDate, $this->rangeStart, $discount, false, true);
        $rangeEndPrices = $this->computePricesForSingleRange($from, $to, $currentDate, $this->rangeEnd, $discount, true);

        $this->prices = [...$rangeStartPrices, ...$rangeEndPrices];
    }

    /** @return Price[] */
    private function computePricesForSingleRange(
        DateTime $from,
        DateTime $to,
        DateTime $currentDate,
        Range $priceRange,
        Discount $discount,
        bool $withHead = false,
        bool $withTail = false
    ): array {
        $prices = [];
        while (
            DateUtils::isWithin($currentDate, $priceRange->from, $priceRange->to, $withHead, $withTail)
            && DateUtils::isBefore($currentDate, $to)
        ) {
            $currentDate->add(new DateInterval('P1D'));

            $currentNight = $currentDate->diff($from);
            $currentDiscount = $discount->getDiscountForDuration((int) $currentNight->days);

            $price = $priceRange->price;
            if (null !== $currentDiscount) {
                $price = $currentDiscount->amount->apply($price);
            }

            $prices[] = $price->getUnitPrice();
        }
        return $prices;
    }
}