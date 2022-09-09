<?php

namespace App\Domain\Customer\Login;

final class LoginResponse
{
    public function __construct(
        public readonly ?string $sessionId,
        /** @var array<int, string> $errors */
        public readonly array $errors = []
    ) {
    }

    /** @return array<int, string> */
    public function getErrors(): array
    {
        return $this->errors;
    }
}