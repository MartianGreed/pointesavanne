<?php

namespace App\Domain\Booking;

use DateTime;

final class Transition
{
    public function __construct(public readonly Status $from, public readonly Status $to, public readonly DateTime $occuredAt)
    {
    }
}