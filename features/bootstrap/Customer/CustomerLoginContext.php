<?php

namespace Features\Context\Customer;

use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Email;
use App\Domain\Customer\Login\LoginRequest;
use App\Domain\Customer\Login\LoginResponse;
use App\Domain\Customer\Login\LoginUseCase;
use App\Domain\Customer\PasswordEncoder;
use App\Domain\Customer\Register\RegistrationRequest;
use App\Domain\Customer\Register\RegistrationUseCase;
use App\Infrastructure\Behat\CustomerUseCaseManager;
use Behat\Behat\Context\Context;
use Webmozart\Assert\Assert;

final class CustomerLoginContext implements Context
{
    use CustomerFeatureTrait;

    private ?LoginRequest $loginRequest = null;
    private ?\Exception $loginRequestException = null;
    private ?\Exception $executeException = null;

    private LoginUseCase $useCase;

    private LoginResponse $loginResponse;

    public function __construct(
        private readonly CustomerUseCaseManager $customerUseCaseManager,
        private readonly RegistrationUseCase $registrationUseCase,
        private readonly CustomerRepository $customerRepository,
        private readonly PasswordEncoder $passwordEncoder,
        private readonly AuthenticationGateway $authenticationGateway,
    ) {
        $this->useCase = new LoginUseCase($this->customerRepository, $this->passwordEncoder, $this->authenticationGateway);
    }

    /**
     * @Given a login request with :email and :password
     */
    public function aLoginRequestWithAnd(string $email, string $password): void
    {
        try {
            $this->loginRequest = new LoginRequest(new Email($email), $password);
        } catch (\Exception $e) {
            $this->loginRequestException = $e;
        }
    }

    /**
     * @When /^the customer wants to login$/
     */
    public function theCustomerWantsToLogin(): void
    {
        if (null === $this->loginRequest) {
            return;
        }

        try {
            $this->loginResponse = $this->useCase->execute($this->loginRequest);
        } catch (\Exception $e) {
            $this->executeException = $e;
        }
    }

    /**
     * @Then I expect an :errorMessage to be thrown
     */
    public function iExpectAnToBeThrown(string $errorMessage): void
    {
        Assert::notNull($this->loginRequestException);
        Assert::eq($this->loginRequestException->getMessage(), $errorMessage);
    }

    /**
     * @Given the customer :email and :password is registered in database
     */
    public function theCustomerAndIsRegisteredInDatabase(string $email, string $password): void
    {
        $this->registrationUseCase->execute(new RegistrationRequest($email, $password, '+33606060606', 'Jean', 'Test'));
    }

    /**
     * @Then /^there should be no errors$/
     */
    public function thereShouldBeNoErrors(): void
    {
        Assert::null($this->loginRequestException);
        Assert::null($this->executeException);
    }

    /**
     * @Given /^session id should be set$/
     */
    public function sessionIdShouldBeSet(): void
    {
        Assert::true($this->authenticationGateway->isCustomerLoggedIn($this->loginResponse->sessionId));
    }

    /**
     * @Given the response should contain the message :errorMessage
     */
    public function theResponseShouldContainTheMessage(string $errorMessage)
    {
        Assert::notNull($this->loginResponse);
        Assert::eq($this->loginResponse->errors[0], $errorMessage);
    }
}