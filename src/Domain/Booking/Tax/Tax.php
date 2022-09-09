<?php

namespace App\Domain\Booking\Tax;

use App\Domain\Booking\Pricing\Price;

interface Tax
{
    public function getAmount(): Price;
}