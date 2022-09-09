<?php

namespace App\Domain\Booking\Exception;

final class InvalidBookingEndDateException extends \DomainException
{
    public function __construct(string $from, string $to)
    {
        parent::__construct(
            sprintf('End date (%s) cannot be before beginning date (%s)', $to, $from)
        );
    }
}