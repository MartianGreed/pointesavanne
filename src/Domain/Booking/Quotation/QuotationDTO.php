<?php

namespace App\Domain\Booking\Quotation;

use App\Domain\Booking\Booking;
use App\Domain\Booking\Pricing\Price;
use App\Domain\Booking\PricingContext;
use App\Domain\Customer\Address;
use App\Domain\Customer\Customer;
use App\Domain\Customer\Exception\AddressCannotBeNullException;
use App\Domain\Shared\DateUtils;

/**
 * @phpstan-type QuotationArray array{
 *  numeric_id: int,
 *  address: array{
 *      name: string,
 *      line1: string,
 *      line2: string|null,
 *      line3: string|null,
 *      phone: string,
 *      email: string
 *  },
 *  pricing: array{
 *      nightsIn: int,
 *      household_tax: Price,
 *      total_amount: Price,
 *      tourist_tax: Price
 *  },
 *  from: string,
 *  to: string,
 *  total_occupants: int,
 *  adults_count: int,
 *  children_count: int,
 *  created_at: string
 * }
 */
final class QuotationDTO
{
    public function __construct(
        private readonly int $numericId,
        private readonly Customer $customer,
        private readonly Address $address,
        private readonly PricingContext $pricingContext,
        private readonly Price $household,
        private readonly string $from,
        private readonly string $to,
        private readonly int $adultsCount,
        private readonly int $childrenCount,
        private readonly string $createdAt
    )
    {

    }
    public static function fromBooking(Booking $booking, int $numericId):self
    {
        $customer = $booking->getCustomer();
        $dates = $booking->getFormattedBookingDates();
        $address = $customer->getAddress();
        if (null === $address) {
            throw new AddressCannotBeNullException();
        }
        return new self(
            $numericId,
            $customer,
            $address,
            $booking->getPricingContext(),
            $booking->getVilla()->getHouseholdAmount(),
            $dates->from,
            $dates->to,
            $booking->getAdultsCount(),
            $booking->getChildrenCount(),
            DateUtils::getDate()->format('d/m/Y')
        );
    }

    /** @return QuotationArray */
    public function toArray(): array
    {
        return [
            'numeric_id' => $this->numericId,
            'address' => [
                'name' => $this->customer->getProfile()->getFirstname() . ' ' . $this->customer->getProfile()->getLastname(),
                'line1' => $this->address->getLine1(),
                'line2' => $this->address->getLine2(),
                'line3' => $this->address->getLine3(),
                'phone' => $this->customer->getProfile()->getPhoneNumber(),
                'email' => $this->customer->getEmail(),
            ],
            'pricing' => [
                'nightsIn' => $this->getNightsInCount(),
                'household_tax' => $this->household,
                'total_amount' => $this->pricingContext->getTotalAmount(),
                'tourist_tax' => $this->pricingContext->getUnrankedTouristTax(
                    DateUtils::getDate($this->from),
                    DateUtils::getDate($this->to),
                    $this->getTotalOccupants(),
                    $this->adultsCount,
                ),
            ],
            'from' => $this->from,
            'to' => $this->to,
            'total_occupants' => $this->adultsCount + $this->childrenCount,
            'adults_count' => $this->adultsCount,
            'children_count' => $this->childrenCount,
            'created_at' => $this->createdAt,
        ];
    }

    private function getTotalOccupants(): int
    {
        return $this->adultsCount + $this->childrenCount;
    }

    private function getNightsInCount(): int
    {
        return (int) DateUtils::getDate($this->from)->diff(DateUtils::getDate($this->to))->days;
    }
}