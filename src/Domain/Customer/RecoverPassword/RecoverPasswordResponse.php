<?php

namespace App\Domain\Customer\RecoverPassword;

final class RecoverPasswordResponse
{
    public function __construct(
        public readonly ?string $message = null,
        /** @var array<string, string> $errors */
        public readonly array $errors = []
    ) {}
}