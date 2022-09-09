<?php

namespace App\Domain\Customer\UpdatePassword;

use App\Domain\Customer\Customer;

final class UpdatePasswordResponse
{
    public function __construct(public readonly string $message, public readonly ?Customer $customer)
    {
    }
}