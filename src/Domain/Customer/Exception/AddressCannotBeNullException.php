<?php

namespace App\Domain\Customer\Exception;

final class AddressCannotBeNullException extends \DomainException
{
    public function __construct()
    {
        parent::__construct('Address cannot be null if customer wants to book.');
    }
}