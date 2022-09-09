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

final class QuotationValidationContext implements Context
{
    use CustomerFeatureTrait, BookingFeatureTrait, CommonFeatureContext;

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
}