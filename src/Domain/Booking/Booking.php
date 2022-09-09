<?php

namespace App\Domain\Booking;

use App\Domain\Booking\Exception\InvalidBookingEndDateException;
use App\Domain\Booking\Pricing\Price;
use App\Domain\Customer\Customer;
use App\Domain\Shared\DateUtils;
use App\Domain\Shared\PDF\File;
use DateTime;

final class Booking
{
    private PricingContext $pricingContext;
    private Status $status;

    private DateTime $createdAt;
    private ?DateTime $updatedAt = null;

    /** @var Transition[]  */
    private array $transitions = [];
    /** @var File[]  */
    private array $files = [];

    private function __construct(
        private readonly BookingId $bookingId,
        private readonly Villa $villa,
        private readonly Customer $customer,
        private readonly DateTime $from,
        private readonly DateTime $to,
        private readonly int $adultsCount,
        private readonly int $childrenCount
    )
    {
        $this->status = Status::QUOTATION_REQUESTED;
        $this->createdAt = new \DateTime('now');
    }

    public static function request(BookingId $bookingId, Villa $villa, Customer $customer, DateTime $from, DateTime $to, int $adultsCount, int $childrenCount = 0): self
    {
        if (DateUtils::isBefore($to, $from)) {
            throw new InvalidBookingEndDateException($from->format('d/m/Y'), $to->format('d/m/Y'));
        }

        return new self($bookingId, $villa, $customer, $from, $to, $adultsCount, $childrenCount);
    }

    public function createPricingContext(): void
    {
        $this->pricingContext = PricingContext::create($this->villa, $this->from, $this->to);
    }

    public function awaitQuotationAcceptance(File $file): void
    {
        $this->files[] = $file;
        $this->transitionTo(Status::QUOTATION_AWAITING_ACCEPTATION);
    }

    public function signQuotation(File $signedQuotation): void
    {
        $this->files[] = $signedQuotation;
        $this->transitionTo(Status::QUOTATION_SIGNED);
    }

    public function transitionTo(Status $status): self
    {
        // @todo : Check if transition is possible
        $this->transitions[] = new Transition($this->status, $status, DateUtils::getDate());
        $this->status = $status;
        $this->updatedAt = DateUtils::getDate();

        return $this;
    }

    public function getId(): string
    {
        return $this->bookingId->toString();
    }

    public function getVilla(): Villa
    {
        return $this->villa;
    }

    public function getCustomer(): Customer
    {
        return $this->customer;
    }

    public function getPricingContext(): PricingContext
    {
        return $this->pricingContext;
    }

    public function getFrom(): DateTime
    {
        return $this->from;
    }

    public function getTo(): DateTime
    {
        return $this->to;
    }

    public function getFormattedBookingDates(): FormattedBookingDates
    {
        return new FormattedBookingDates(
            $this->from->format('d/m/Y'),
            $this->to->format('d/m/Y')
        );
    }

    public function getUnrankedTouristTax(): Price
    {
        return $this->pricingContext->getUnrankedTouristTax($this->from, $this->to, $this->adultsCount + $this->childrenCount, $this->adultsCount);
    }

    public function getRankedTouristTax(): Price
    {
        return $this->pricingContext->getRankedTouristTax($this->from, $this->to, $this->adultsCount);
    }

    public function getAdultsCount(): int
    {
        return $this->adultsCount;
    }

    public function getChildrenCount(): int
    {
        return $this->childrenCount;
    }

    public function getStatus(): Status
    {
        return $this->status;
    }

    /** @return File[] */
    public function getFiles(): array
    {
        return $this->files;
    }

    public function getCreatedAt(): DateTime
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): ?DateTime
    {
        return $this->updatedAt;
    }

    /** @return Transition[] */
    public function getTransitions(): array
    {
        return $this->transitions;
    }
}