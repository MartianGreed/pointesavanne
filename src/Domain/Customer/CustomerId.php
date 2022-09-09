<?php

namespace App\Domain\Customer;

use App\Domain\Shared\UuidBuilderTrait;
use App\Domain\Uuid;

final class CustomerId extends Uuid
{
    use UuidBuilderTrait;
}