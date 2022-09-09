<?php

namespace App\Domain\Customer;

final class Roles
{
    private function __construct(
        /** @var array<string> */
        private readonly array $value
    ) {}

    public static function default(): self
    {
        return new self(['ROLE_USER']);
    }

    public static function admin(): self
    {
        return new self(['ROLE_USER', 'ROLE_ADMIN']);
    }

    /** @return array<string> */
    public function getRoles(): array
    {
        return $this->value;
    }
}