<?php

namespace App\Domain;

abstract class Uuid
{
    protected function __construct(private readonly string $value)
    {
    }

    public function toString(): string
    {
        return $this->value;
    }
}