<?php

namespace App\Domain\Customer;

interface CustomerRepository
{
    public function doesCustomerWithEmailExists(string $email): bool;
    public function saveCustomer(Customer $customer): void;

    public function findCustomerByEmail(Email $email): ?Customer;

    public function findCustomerByResetToken(string $token): ?Customer;
}