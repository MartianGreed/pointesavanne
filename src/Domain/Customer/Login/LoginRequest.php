<?php

namespace App\Domain\Customer\Login;

use App\Domain\Customer\Email;

final class LoginRequest
{
    public function __construct(public readonly Email $email, public readonly string $plainPassword)
    {
    }
}