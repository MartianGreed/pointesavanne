<?php

namespace App\Domain\Customer\UpdatePassword;

use App\Domain\Customer\Customer;

interface PasswordUpdater
{
    public function updateFromRequest(UpdatePasswordRequest $request): Customer;
}