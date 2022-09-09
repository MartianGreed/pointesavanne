<?php

namespace App\Infrastructure\Behat;

use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\Customer;
use App\Domain\Customer\Exception\CustomerIsNotLoggedInException;
use App\Domain\UuidGenerator;

final class InMemoryAuthenticationGateway implements AuthenticationGateway
{
    /** @var array<Customer> */
    private array $customersLoggedIn = [];
    private ?string $currentSessionId = null;

    public function isCustomerLoggedIn(string $sessionId): bool
    {
        return array_key_exists($sessionId, $this->customersLoggedIn);
    }

    public function getCustomer(string $sessionId): Customer
    {
        if (!$this->isCustomerLoggedIn($sessionId)) {
            throw new CustomerIsNotLoggedInException($sessionId);
        }

        return $this->customersLoggedIn[$sessionId];
    }

    public function logCustomerIn(Customer $customer): string
    {
        $sessionId = UuidGenerator::v4();
        $this->customersLoggedIn[$sessionId] = $customer;

        $this->currentSessionId = $sessionId;

        return $sessionId;
    }

    public function getCurrentLoggedInCustomer(): Customer
    {
        return $this->getCustomer((string)$this->currentSessionId);
    }
}