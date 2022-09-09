<?php

namespace Features\Context\Customer;

use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Email;
use App\Domain\Customer\Register\RegistrationUseCase;
use App\Domain\Customer\SaveProfile\SaveProfileRequest;
use App\Domain\Customer\SaveProfile\SaveProfileResponse;
use App\Domain\Customer\SaveProfile\SaveProfileUseCase;
use App\Infrastructure\Behat\CustomerUseCaseManager;
use Behat\Behat\Context\Context;
use Behat\Gherkin\Node\TableNode;
use Webmozart\Assert\Assert;

final class CustomerSaveProfileContext implements Context
{
    use CustomerFeatureTrait;

    private SaveProfileRequest $saveProfileRequest;
    private SaveProfileResponse $useCaseResponse;
    private ?\Exception $requestException = null;
    private ?\Exception $executeException = null;

    private array $valuesToUpdate = [];

    public function __construct(
        private readonly CustomerUseCaseManager $customerUseCaseManager,
        private readonly RegistrationUseCase $registrationUseCase,
        private readonly SaveProfileUseCase $useCase,
        private readonly CustomerRepository $customerRepository,
    )
    {
    }

    /**
     * @Given a save profile request with :identifier and:
     */
    public function aSaveProfileRequestWith(string $identifier, TableNode $table)
    {
        $this->valuesToUpdate = $table->getColumnsHash()[0];
        try {
            $this->saveProfileRequest = new SaveProfileRequest(new Email($identifier), ...$this->valuesToUpdate);
        } catch (\Exception $e) {
            $this->requestException = $e;
        }
    }

    /**
     * @When /^the customer wants to save his profile$/
     */
    public function theCustomerWantsToSaveHisProfile()
    {
        try {
            $this->useCaseResponse = $this->useCase->execute($this->saveProfileRequest);
        } catch (\Exception $e) {
            $this->executeException = $e;
        }
    }

    /**
     * @Then /^there should be no errors on SaveProfileResponse$/
     */
    public function thereShouldBeNoErrorsOnSaveProfileResponse()
    {
        Assert::null($this->executeException);
        Assert::null($this->requestException);

        $customer = $this->useCaseResponse->getCustomer();
        Assert::notNull($customer);
        foreach ($this->valuesToUpdate as $key => $value) {
            $getter = 'get'.ucfirst($key);
            if ('line1' === $key || 'line2' === $key || 'line3' === $key) {
                Assert::eq($customer->getAddress()->{$getter}(), $value);
                continue;
            }
            Assert::eq($customer->getProfile()->{$getter}(), $value);
        }
    }
}