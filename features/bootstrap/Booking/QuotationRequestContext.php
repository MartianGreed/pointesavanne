<?php

namespace Features\Context\Booking;

use App\Domain\AsyncMessage;
use App\Domain\Booking\Pricing\PriceParser;
use App\Domain\Booking\Quotation\QuotationRequest;
use App\Domain\Booking\Quotation\QuotationResponse;
use App\Domain\Booking\Quotation\QuotationUseCase;
use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Register\RegistrationUseCase;
use App\Domain\Mailer;
use App\Domain\Shared\DateUtils;
use App\Infrastructure\Behat\BookingUseCaseManager;
use App\Infrastructure\Behat\CustomerUseCaseManager;
use Behat\Behat\Context\Context;
use Features\Context\CommonFeatureContext;
use Features\Context\Customer\CustomerFeatureTrait;
use Webmozart\Assert\Assert;

final class QuotationRequestContext implements Context
{
    use CustomerFeatureTrait, BookingFeatureTrait, CommonFeatureContext;

    private QuotationRequest $quotationRequest;
    private QuotationResponse $quotationResponse;
    private ?\Exception $requestException = null;
    private ?\Exception $executeException = null;

    public function __construct(
        private readonly CustomerUseCaseManager $customerUseCaseManager,
        private readonly BookingUseCaseManager $bookingUseCaseManager,
        private readonly RegistrationUseCase $registrationUseCase,
        private readonly QuotationUseCase $useCase,
        private readonly CustomerRepository $customerRepository,
        private readonly AuthenticationGateway $authenticationGateway,
        private readonly Mailer $mailer,
        private readonly AsyncMessage $asyncMessage,
        private readonly PriceParser $priceParser = new PriceParser(),
    )
    {
    }

    /**
     * @Given a QuotationRequest to villa named :name from :from to :to for :adultsCount adults and :childrenCount children
     */
    public function aQuotationRequestToVillaNamedFromToForAdultsAndChildren(string $name, string $from, string $to, int $adultsCount, int $childrenCount)
    {
        try {
            $this->quotationRequest = new QuotationRequest($this->villa, DateUtils::getDate($from), DateUtils::getDate($to), $adultsCount, $childrenCount);
        } catch (\Exception $e) {
            $this->requestException = $e;
        }
    }

    /**
     * @When the customer submits the QuotationRequest
     */
    public function theCustomerSubmitsTheQuotationRequest()
    {
        try {
            $this->quotationResponse = $this->useCase->execute($this->quotationRequest);
        } catch (\Exception $e) {
            $this->executeException = $e;
        }
    }

    /**
     * @Then it should be accepted with a total amount of :totalAmount, a tourist tax of :unrankedTouristTax unranked and :rankedTouristTac with a 4 star rating ranking and a deposit amount of :depositAmount
     */
    public function itShouldBeAcceptedWithATotalAmountOfATouristTaxOfUnrankedAndWithAStarRatingRankingAndADepositAmountOf(
        string $totalAmount,
        string $unrankedTouristTax,
        string $rankedTouristTax,
        string $depositAmount
    ) {
        $booking = $this->quotationResponse->booking;
        $pricingContext = $booking->getPricingContext();

        Assert::same((string)$pricingContext->getTotalAmount(), $totalAmount);
        Assert::same((string)$booking->getUnrankedTouristTax(), $unrankedTouristTax);
        Assert::same((string)$booking->getRankedTouristTax(), $rankedTouristTax);
        Assert::same((string)$booking->getVilla()->getDepositAmount(), $depositAmount);
    }
}