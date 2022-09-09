<?php

namespace App\Domain\Customer\Exception;

final class CustomerIsNotLoggedInException extends \DomainException
{
    public function __construct(string $sessionId)
    {
        parent::__construct(sprintf('Cannot find logged in customer for session with id : %s', $sessionId));
    }
}