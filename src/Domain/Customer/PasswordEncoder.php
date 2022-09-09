<?php

namespace App\Domain\Customer;

interface PasswordEncoder
{
    public function encode(string $plain): string;
    public function check(string $encoded, string $plain): bool;
}