<?php

namespace App\Domain\Shared;

use App\Domain\FromStringUuidTrait;
use App\Domain\UuidGenerator;

trait UuidBuilderTrait
{
    use FromStringUuidTrait;

    public static function build(): self
    {
        return self::fromString(UuidGenerator::v4());
    }
}