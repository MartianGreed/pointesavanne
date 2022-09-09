<?php

namespace App\Infrastructure\Symfony;

use App\Domain\Customer\PasswordEncoder;
use Symfony\Component\PasswordHasher\PasswordHasherInterface;

final class SymfonyPasswordEncoder implements PasswordEncoder
{
    public function __construct(private readonly PasswordHasherInterface $hasher)
    {
    }

    public function encode(string $plain): string
    {
        return $this->hasher->hash($plain);
    }

    public function check(string $encoded, string $plain): bool
    {
        return $this->hasher->verify($encoded, $plain);
    }
}