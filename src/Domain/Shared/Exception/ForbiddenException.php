<?php

namespace App\Domain\Shared\Exception;

final class ForbiddenException extends \DomainException
{
    public function __construct(string $message)
    {
        parent::__construct($message);
    }
}