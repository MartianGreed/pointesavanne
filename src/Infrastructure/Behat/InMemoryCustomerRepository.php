<?php

namespace App\Infrastructure\Behat;

use App\Domain\Customer\Customer;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Email;

final class InMemoryCustomerRepository implements CustomerRepository
{
    /** @var array<Customer> */
    private array $customers = [];

    public function doesCustomerWithEmailExists(string $email): bool
    {
        return array_key_exists($email, $this->customers);
    }

    public function saveCustomer(Customer $customer): void
    {
        $this->customers[$customer->getEmail()] = $customer;
    }

    public function findCustomerByEmail(Email $email): ?Customer
    {
        if ($this->doesCustomerWithEmailExists($email->getValue())) {
            return $this->customers[$email->getValue()];
        }

        return null;
    }

    public function findCustomerByResetToken(string $token): ?Customer
    {
        $customer = array_filter(
            $this->customers,
            static fn(Customer $c) => $c->getRecoverPassword()?->getToken() === $token
        );

        return array_shift($customer);
    }
}