<?php

namespace App\Domain;

trait FromStringUuidTrait
{
    public static function fromString(string $value): self
    {
        return new self($value);
    }
}