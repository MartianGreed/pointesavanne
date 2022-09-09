<?php

namespace App\Domain\Customer\Exception;

final class CustomerNotFoundException extends \DomainException
{
    public function __construct(string $email)
    {
        parent::__construct(sprintf('Customer with email : %s not found', $email));
    }
}