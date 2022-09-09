<?php

namespace App\Domain\Customer;

use Webmozart\Assert\Assert;

final class Email
{
    private string $value;

    public function __construct(string $email)
    {
        Assert::email($email, 'Email is not properly formatted');

        $this->value = $email;
    }

    public function getValue(): string
    {
        return $this->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}