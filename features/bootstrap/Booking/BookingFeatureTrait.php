<?php

namespace Features\Context\Booking;

use App\Domain\Booking\Booking;
use App\Domain\Booking\BookingId;
use App\Domain\Booking\Discount\Discount;
use App\Domain\Booking\Discount\DiscountAmount;
use App\Domain\Booking\Discount\Range as DiscountRange;
use App\Domain\Booking\Pricing\PriceRange;
use App\Domain\Booking\Pricing\Range as PricingRange;
use App\Domain\Booking\Quotation\QuotationDTO;
use App\Domain\Booking\Quotation\QuotationRequest;
use App\Domain\Booking\QuotationGeneration\QuotationGenerationRequest;
use App\Domain\Booking\Status;
use App\Domain\Booking\Villa;
use App\Domain\Shared\DateUtils;
use App\Infrastructure\Behat\QuotationSignedPDF;
use Behat\Behat\Tester\Exception\PendingException;
use Behat\Gherkin\Node\TableNode;
use Webmozart\Assert\Assert;

trait BookingFeatureTrait
{
    protected Villa $villa;
    private Discount $discount;
    private PriceRange $priceRange;
    private ?Booking $backgroundBooking = null;

    /**
     * @Given a villa :name with a caution amount of :amount and the mandatory household of :householdAmount
     */
    public function aVillaWithACautionAmountOfAndTheMandatoryHouseholdOf(string $name, string $amount, string $houseHoldAmount)
    {
        $this->villa = new Villa($name, $this->priceParser->parse($amount), $this->priceParser->parse($houseHoldAmount));
    }

    /**
     * @Given /^a discount over time set as :$/
     */
    public function aDiscountOverTimeSetAs(TableNode $table)
    {
        $discount = new Discount();
        foreach ($table->getColumnsHash() as $key => $value) {
            $discount->addRange(new DiscountRange($value['from'], $value['to'], DiscountAmount::parse($value['discountAmount'])));
        }

        $this->discount = $discount;
    }

    /**
     * @Given /^the following pricing range :$/
     */
    public function theFollowingPricingRange(TableNode $table)
    {
        $priceRange = new PriceRange();

        foreach ($table->getColumnsHash() as $range) {
            $priceRange->addRange(new PricingRange(DateUtils::getDate($range['from']), DateUtils::getDate($range['to']), $this->priceParser->parse($range['baseAmount'])));
        }

        $this->villa
            ->setPriceRange($priceRange)
            ->setDiscount($this->discount)
        ;

    }

    /**
     * @Given :emailCount emails should have been sent
     */
    public function emailsShouldHaveBeenSent(int $emailCount)
    {
        Assert::count($this->mailer->getSent(), $emailCount);
    }

    /**
     * @Given an :messageClass event at index :index has been dispatched
     */
    public function anEventHasBeenDispatched(string $messageClass, int $index)
    {
        Assert::isInstanceOf($this->asyncMessage->getDispatchedMessages()[$index], $messageClass);
    }

    /**
     * @Given villa named :villaName is booked :
     */
    public function villaNamedIsBooked(string $villaName, TableNode $table)
    {
        foreach ($table->getColumnsHash() as $column) {
            $this->useCase->execute(new QuotationRequest($this->villa, DateUtils::getDate($column['from']), DateUtils::getDate($column['to']), $column['adults'], $column['children']));
        }
    }

    /**
     * @Given the booking should in state :state
     */
    public function theBookingShouldInState(string $state)
    {
        Assert::eq(Status::from($state), $this->booking->getStatus());
    }

    /**
     * @Given :villaName has a quotation request by :email from :from to :to for :adults adults and :children children
     */
    public function hasAQuotationRequestByFromToForAdultsAndChildren(string $villaName, string $email, string $from, string $to, int $adults, int $children)
    {
        $this->backgroundBooking = $this->bookingUseCaseManager->requestQuotation(new QuotationRequest(
            $this->villa,
            DateUtils::getDate($from),
            DateUtils::getDate($to),
            $adults,
            $children
        ))->booking;
    }

    /**
     * @Given quotation has been generated
     */
    public function quotationHasBeenGenerated()
    {
        $this->bookingUseCaseManager->generateQuotation(new QuotationGenerationRequest(BookingId::fromString($this->backgroundBooking->getId())));
    }

    /**
     * @Given /^the signed quotation is uploaded$/
     */
    public function theSignedQuotationIsUploaded()
    {
        // While testing, we generate a fake file but during application runtime file is already uploaded
        // only the file path is provided to application.
        $this->PDFGenerator->generate(
            QuotationSignedPDF::generate(
                $this->backgroundBooking->getId(),
                QuotationDTO::fromBooking($this->backgroundBooking, 1)
            )
        );
    }
}