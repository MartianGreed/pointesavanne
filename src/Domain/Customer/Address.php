<?php

namespace App\Domain\Customer;

final class Address
{
    public function __construct(
        private readonly string $line1,
        private readonly ?string $line3,
        private readonly ?string $line2 = null,
    )
    {

    }

    public function getLine1(): string
    {
        return $this->line1;
    }

    public function getLine2(): ?string
    {
        return $this->line2;
    }

    public function getLine3(): ?string
    {
        return $this->line3;
    }
}