<?php

namespace Features\Context\Customer;

use App\Domain\Customer\Email;
use App\Domain\Customer\Register\RegistrationRequest;
use App\Domain\Customer\SaveProfile\SaveProfileRequest;
use Behat\Gherkin\Node\TableNode;
use Features\Context\CommonFeatureContext;
use Webmozart\Assert\Assert;

trait CustomerFeatureTrait
{
    use CommonFeatureContext;
    
    protected string $sessionId;

    /**
     * @Given /^a set of customers are already registered:$/
     */
    public function aSetOfCustomersAreAlreadyRegistered(TableNode $table): void
    {
        foreach ($table->getColumnsHash() as $customer) {
            $this->customerUseCaseManager->register(new RegistrationRequest($customer['email'], $customer['password'], $customer['phoneNumber'], $customer['firstname'], $customer['lastname']));

            if (array_key_exists('line1', $customer) && array_key_exists('line3', $customer)) {
                $line1 = 'NULL' === $customer['line1'] ? null : $customer['line1'];
                $line2 = 'NULL' === $customer['line2'] ? null : $customer['line2'];
                $line3 = 'NULL' === $customer['line3'] ? null : $customer['line3'];

                $this->customerUseCaseManager->saveProfile(new SaveProfileRequest(new Email($customer['email']), line1: $line1, line2: $line2, line3: $line3));
            }

        }
    }

    /**
     * @Then I expect an exception class :exception to be thrown
     */
    public function iExpectAnExceptionClassToBeThrown(string $exception): void
    {
        if (null === $this->executeException) {
            throw new \RuntimeException('No exception has been thrown during execution.');
        }

        Assert::eq($exception, \get_class($this->executeException));
    }

    /**
     * @Given :identifier is logged in
     */
    public function isLoggedIn(string $identifier)
    {
        $customer = $this->customerRepository->findCustomerByEmail(new Email($identifier));

        Assert::notNull($customer);

        $this->sessionId = $this->authenticationGateway->logCustomerIn($customer);
    }
}