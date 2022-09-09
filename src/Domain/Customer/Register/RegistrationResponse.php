<?php

namespace App\Domain\Customer\Register;

use App\Domain\Customer\Customer;

final class RegistrationResponse
{
    public function __construct(
        private readonly ?Customer $customer,
        /** @var array<string> $errors */
        private readonly array $errors = []
    ) {}

    public function getCustomer(): ?Customer
    {
        return $this->customer;
    }

    /** @return array<string> */
    public function getErrors(): array
    {
        return $this->errors;
    }
}