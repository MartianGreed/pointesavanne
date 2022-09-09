<?php

namespace Features\Context\Customer;

use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Email;
use App\Domain\Customer\Register\RegistrationUseCase;
use App\Domain\Customer\UpdatePassword\UpdatePasswordRequest;
use App\Domain\Customer\UpdatePassword\UpdatePasswordResponse;
use App\Domain\Customer\UpdatePassword\UpdatePasswordUseCase;
use App\Infrastructure\Behat\CustomerUseCaseManager;
use Behat\Behat\Context\Context;
use Behat\Behat\Tester\Exception\PendingException;
use Webmozart\Assert\Assert;

final class UpdatePasswordContext implements Context
{
    use CustomerFeatureTrait;

    private UpdatePasswordRequest $updatePasswordRequest;
    private UpdatePasswordResponse $updatePasswordResponse;
    private ?\Exception $requestException = null;
    private ?\Exception $executeException = null;

    public function __construct(
        private readonly CustomerUseCaseManager $customerUseCaseManager,
        private readonly RegistrationUseCase $registrationUseCase,
        private readonly UpdatePasswordUseCase $useCase,
        private readonly CustomerRepository $customerRepository,
        private readonly AuthenticationGateway $authenticationGateway,
    )
    {
    }

    /**
     * @Given an UpdatePassword request with :email, :old, :new, :token
     */
    public function anUpdatePasswordRequestWithNull(?string $email = null, ?string $old = null, ?string $new = null, ?string $token = null)
    {
        try {
            $emailArg = null === $email ? $email : new Email($email);
            $this->updatePasswordRequest = new UpdatePasswordRequest($emailArg, $old, $new, $token);
        } catch (\Exception $e) {
            $this->requestException = $e;
        }
    }

    /**
     * @When /^the customer wants to update his password$/
     */
    public function theCustomerWantsToUpdateHisPassword()
    {
        try {
            $this->updatePasswordResponse = $this->useCase->execute($this->updatePasswordRequest);
        } catch (\Exception $e) {
            $this->executeException = $e;
        }
    }

    /**
     * @Then /^there should be no errors on UpdateProfileResponse$/
     */
    public function thereShouldBeNoErrorsOnUpdateProfileResponse()
    {
        Assert::null($this->requestException);
        Assert::null($this->executeException);

        Assert::eq('Password successfully updated', $this->updatePasswordResponse->message);
    }

    /**
     * @Given :identifier has made a RecoverPasswordRequest with token :token
     */
    public function customerHasMadeARecoverPasswordRequestWithToken(string $identifier, string $token)
    {
        $customer = $this->customerRepository->findCustomerByEmail(new Email($identifier));

        $customer->recoverPassword($token);
    }
}