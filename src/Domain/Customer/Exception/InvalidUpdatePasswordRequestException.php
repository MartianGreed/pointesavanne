<?php

namespace App\Domain\Customer\Exception;

final class InvalidUpdatePasswordRequestException extends \DomainException
{

    public function __construct()
    {
        parent::__construct('You have to provide either a email and passwords or a token and a password.');
    }
}