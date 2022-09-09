<?php
declare(strict_types=1);

namespace Features\Context\Customer;

use App\Domain\Customer\Customer;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\PasswordEncoder;
use App\Domain\Customer\Register\RegistrationRequest;
use App\Domain\Customer\Register\RegistrationResponse;
use App\Domain\Customer\Register\RegistrationUseCase;
use App\Domain\Mailer;
use App\Infrastructure\Behat\CustomerUseCaseManager;
use Behat\Behat\Context\Context;
use Webmozart\Assert\Assert;

class CustomerRegistrationContext implements Context
{
    use CustomerFeatureTrait;

    private RegistrationUseCase $useCase;

    private ?RegistrationRequest $registrationRequest = null;
    private RegistrationResponse $registrationResponse;
    private ?Customer $customer;
    private ?\Exception $requestException;

    public function __construct(
        private readonly CustomerUseCaseManager $customerUseCaseManager,
        private readonly RegistrationUseCase $registrationUseCase,
        private readonly PasswordEncoder $passwordEncoder,
        private readonly CustomerRepository $customerRepository,
        private readonly Mailer $mailer
    )
    {
        $this->useCase = new RegistrationUseCase($this->passwordEncoder, $this->customerRepository, $this->mailer);
    }

    /**
     * @Given a request with following informations :email, :password, :phoneNumber, :firstname, :lastname
     */
    public function aRequestWithFollowingInformations(string $email, string $password, string $phoneNumber, string $firstname, string $lastname): void
    {
        try {
            $this->registrationRequest = new RegistrationRequest($email, $password, $phoneNumber, $firstname, $lastname);
        } catch (\Exception $e) {
            $this->requestException = $e;
        }
    }

    /**
     * @When /^the customer wants to register$/
     */
    public function theCustomerWantsToRegister(): void
    {
        if (null === $this->registrationRequest) {
            return;
        }
        $response = $this->useCase->execute($this->registrationRequest);
        $this->registrationResponse = $response;
        $this->customer = $response->getCustomer();
    }

    /**
     * @Then /^it should be registered$/
     */
    public function itShouldBeRegistered(): void
    {
        Assert::true($this->customerRepository->doesCustomerWithEmailExists($this->customer->getEmail()));
    }

    /**
     * @Then RegistrationResponse should contain one error message saying :errorMessage
     */
    public function registrationresponseShouldContainOneErrorMessageSaying(string $errorMessage): void
    {
        $errors = $this->registrationResponse->getErrors();

        Assert::count($errors, 1);
        Assert::eq($errors[0], $errorMessage);
    }

    /**
     * @Then I expect an :errorMessage to be thrown
     */
    public function iExpectAnToBeThrown(string $errorMessage): void
    {
        Assert::notNull($this->requestException);
        Assert::eq($this->requestException->getMessage(), $errorMessage);
    }
}