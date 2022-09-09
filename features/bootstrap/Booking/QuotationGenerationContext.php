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
use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Register\RegistrationUseCase;
use App\Domain\FileLocator;
use App\Domain\Mailer;
use App\Domain\Message;
use App\Domain\Shared\DateUtils;
use App\Domain\Shared\PDF\File;
use App\Infrastructure\Behat\BookingUseCaseManager;
use App\Infrastructure\Behat\CustomerUseCaseManager;
use Behat\Behat\Context\Context;
use Behat\Behat\Hook\Scope\AfterScenarioScope;
use Behat\Hook\AfterScenario;
use Features\Context\CommonFeatureContext;
use Features\Context\Customer\CustomerFeatureTrait;
use Webmozart\Assert\Assert;
use function DI\get;

final class QuotationGenerationContext implements Context
{
    use CustomerFeatureTrait, BookingFeatureTrait, CommonFeatureContext;

    private QuotationGenerationRequest $quotationGenerationRequest;
    private QuotationGenerationResponse $quotationGenerationResponse;
    private ?\Exception $executeException = null;

    private ?Message $runningMessage = null;
    private string $bookingId;

    private const UUID_V4_REGEX = '/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/';
    private ?Booking $booking = null;

    public function __construct(
        private readonly CustomerUseCaseManager $customerUseCaseManager,
        private readonly BookingUseCaseManager $bookingUseCaseManager,
        private readonly RegistrationUseCase $registrationUseCase,
        private readonly QuotationUseCase $quotationUseCase,
        private readonly QuotationGenerationUseCase $useCase,
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
     * @Given an :messageClass has been dispatched
     */
    public function aQuotationGenerationRequestHasBeenDispatched(string $messageClass)
    {
        // Running this in a CI env won't work because AWS is doing an automatic dispatch and call on lambdas
        // to check this is working in test mode we need to simulate this.
        if ($this->isTestEnv()) {
            $event = array_filter($this->asyncMessage->getDispatchedMessages(), static fn(Message $message) => \get_class($message) === $messageClass)[0];

            $this->runningMessage = $event;
        }
    }

    /**
     * @When the message is handled
     */
    public function theMessageIsHandled()
    {
        if ($this->isTestEnv()) {
            Assert::notNull($this->runningMessage);
            $this->bookingId =  $this->runningMessage->bookingId;
            $quotationGenerationRequest = new QuotationGenerationRequest(BookingId::fromString($this->runningMessage->bookingId));

            try {
                $this->quotationGenerationResponse = $this->useCase->execute($quotationGenerationRequest);
                $this->booking =  $this->quotationGenerationResponse->booking;
            } catch (\Exception $e) {
                $this->executeException = $e;
            }
        }
    }

    /**
     * @Then pdf file should have been generated and placed on filesystem with path :path
     */
    public function pdfFileShouldHaveBeenGeneratedAndPlacedOnFilesystemWithPath(string $path)
    {
        $realPath = str_replace('<bookingId>', $this->bookingId, $path);

        Assert::isInstanceOf($this->fileLocator->locate($realPath), File::class);
    }

    /**
     * @AfterScenario
     */
    public function cleanFilesystem(AfterScenarioScope $event): void
    {
        $this->fileLocator->cleanFilesystem();
    }
}