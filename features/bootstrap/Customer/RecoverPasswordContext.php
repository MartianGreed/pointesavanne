<?php

namespace Features\Context\Customer;

use App\Domain\Customer\Email;
use App\Domain\Customer\RecoverPassword\RecoverPasswordRequest;
use App\Domain\Customer\RecoverPassword\RecoverPasswordResponse;
use App\Domain\Customer\RecoverPassword\RecoverPasswordUseCase;
use App\Domain\Customer\Register\RegistrationUseCase;
use App\Infrastructure\Behat\CustomerUseCaseManager;
use Behat\Behat\Context\Context;
use Behat\Behat\Tester\Exception\PendingException;
use Behat\Gherkin\Node\TableNode;
use Webmozart\Assert\Assert;

final class RecoverPasswordContext implements Context
{
    use CustomerFeatureTrait;

    private RecoverPasswordRequest $recoverPasswordRequest;
    private RecoverPasswordResponse $recoverPasswordResponse;
    private ?\Exception $requestException = null;
    private ?\Exception $executeException = null;

    public function __construct(
        private readonly CustomerUseCaseManager $customerUseCaseManager,
        private readonly RegistrationUseCase $registrationUseCase,
        private readonly RecoverPasswordUseCase $useCase,
    )
    {
    }

    /**
     * @Given a recover password request with :identifier
     */
    public function aRecoverPasswordRequestWith($identifier): void
    {
        try {
            $this->recoverPasswordRequest = new RecoverPasswordRequest(new Email($identifier));
        } catch (\Exception $e) {
            $this->requestException = $e;
        }
    }

    /**
     * @When /^the customer wants to recover his password$/
     */
    public function theCustomerWantsToRecoverHisPassword(): void
    {
        try {
            $this->recoverPasswordResponse = $this->useCase->execute($this->recoverPasswordRequest);
        } catch (\Exception $e) {
            $this->executeException = $e;
        }
    }

    /**
     * @Then /^there should be no errors RecoverPasswordResponse$/
     */
    public function thereShouldBeNoErrorsRecoverPasswordResponse(): void
    {
        Assert::null($this->requestException);
        Assert::null($this->executeException);
    }

    /**
     * @Given RecoverPasswordResponse should contain :message
     */
    public function recoverpasswordresponseShouldContain(string $message): void
    {
        Assert::eq($this->recoverPasswordResponse->message, $message);
    }
}