<?php

namespace App\Domain\Customer\Exception;

final class NoUpdatePasswordStrategyFound extends \DomainException
{
    public function __construct()
    {
        parent::__construct('No update strategy found. Please contact administrator');
    }
}