<?php

namespace App\Domain\Customer\RecoverPassword;

use App\Domain\Customer\Email;

final class RecoverPasswordRequest
{
    public function __construct(public readonly Email $identifier)
    {
    }
}