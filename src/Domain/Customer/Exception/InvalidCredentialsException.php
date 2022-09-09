<?php

namespace App\Domain\Customer\Exception;

final class InvalidCredentialsException extends \DomainException
{
    public function __construct()
    {
        parent::__construct('Invalid credentials.');
    }
}