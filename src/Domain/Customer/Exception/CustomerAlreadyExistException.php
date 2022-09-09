<?php

namespace App\Domain\Customer\Exception;

final class CustomerAlreadyExistException extends \DomainException
{
    public function __construct(string $email)
    {
        parent::__construct(sprintf('Customer with email %s already exists. Please recover your password', $email));
    }
}