<?php

namespace App\Domain\Booking;

use App\Domain\Shared\UuidBuilderTrait;
use App\Domain\Uuid;

final class BookingId extends Uuid
{
    use UuidBuilderTrait;
}