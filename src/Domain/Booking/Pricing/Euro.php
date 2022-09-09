<?php

namespace App\Domain\Booking\Pricing;

final class Euro extends Currency
{
    public function __construct()
    {
        parent::__construct('€', 'EUR');
    }
}