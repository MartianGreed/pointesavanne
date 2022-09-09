<?php

namespace App\Domain\Customer\SaveProfile;

use App\Domain\Customer\Customer;

final class SaveProfileResponse
{
    public function __construct(
        private readonly ?Customer $customer,
        /** @var array<string, string> */
        private readonly array $errors = []
    ) {}

    public function getCustomer(): ?Customer
    {
        return $this->customer;
    }

    /** @return array<string, string> */
    public function getErrors(): array
    {
        return $this->errors;
    }
}