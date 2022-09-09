<?php

namespace Features\Context\Booking;

use App\Domain\AsyncMessage;
use App\Domain\Booking\Booking;
use App\Domain\Booking\BookingId;
use App\Domain\Booking\Pricing\PriceParser;
use App\Domain\Booking\Quotation\QuotationRequest;
use App\Domain\Booking\Quotation\QuotationUseCase;
use App\Domain\Booking\QuotationGeneration\QuotationGenerationRequest;
use App\Domain\Booking\QuotationGeneration\QuotationGenerationResponse;
use App\Domain\Booking\QuotationGeneration\QuotationGenerationUseCase;
use App\Domain\Booking\QuotationSigned\QuotationSignedRequest;
use App\Domain\Booking\QuotationSigned\QuotationSignedResponse;
use App\Domain\Booking\QuotationSigned\QuotationSignedUseCase;
use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Register\RegistrationUseCase;
use App\Domain\FileLocator;
use App\Domain\Mailer;
use App\Domain\Message;
use App\Domain\Shared\DateUtils;
use App\Domain\Shared\PDF\File;
use App\Domain\Shared\PDF\PDFGenerator;
use App\Infrastructure\Behat\BookingUseCaseManager;
use App\Infrastructure\Behat\CustomerUseCaseManager;
use Behat\Behat\Context\Context;
use Behat\Behat\Hook\Scope\AfterScenarioScope;
use Behat\Behat\Tester\Exception\PendingException;
use Behat\Hook\AfterScenario;
use Features\Context\CommonFeatureContext;
use Features\Context\Customer\CustomerFeatureTrait;
use Webmozart\Assert\Assert;
use function DI\get;

final class QuotationSignedContext implements Context
{
    use CustomerFeatureTrait, BookingFeatureTrait, CommonFeatureContext;

    private QuotationSignedResponse $signedResponse;
    private ?\Exception $executeException = null;

    public function __construct(
        private readonly CustomerUseCaseManager $customerUseCaseManager,
        private readonly BookingUseCaseManager $bookingUseCaseManager,
        private readonly QuotationSignedUseCase $useCase,
        private readonly PDFGenerator $PDFGenerator,
        private readonly CustomerRepository $customerRepository,
        private readonly AuthenticationGateway $authenticationGateway,
        private readonly Mailer $mailer,
        private readonly AsyncMessage $asyncMessage,
        private readonly FileLocator $fileLocator,
        private readonly PriceParser $priceParser = new PriceParser(),
    )
    {
    }

    /**
     * @AfterScenario
     */
    public function cleanFilesystem(AfterScenarioScope $event): void
    {
        $this->fileLocator->cleanFilesystem();
    }

    /**
     * @When /^customer has signed quotation$/
     */
    public function customerHasSignedQuotation()
    {
        $bookingId = $this->backgroundBooking->getId();

        try {
            $this->signedResponse = $this->useCase->execute(new QuotationSignedRequest(BookingId::fromString($bookingId), new File('booking/'.$bookingId.'/devis-signe.pdf')));
            $this->booking = $this->signedResponse->booking;
        } catch (\Exception $e) {
            $this->executeException = $e;
        }
    }
}