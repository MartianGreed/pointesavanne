<?php

namespace App\Domain\Booking\Exception;

final class UnsupportedCurrencyException extends \DomainException
{
    public function __construct(string $symbol)
    {
        parent::__construct(sprintf('Currency %s is not supported yet.', $symbol));
    }
}