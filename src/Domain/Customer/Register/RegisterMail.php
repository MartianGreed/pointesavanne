<?php

namespace App\Domain\Customer\Register;

use App\Domain\Mail;

final class RegisterMail extends Mail
{
    /**
     * @param array<string>        $recipients
     * @param array<string, mixed> $values
     * @param string|null          $sender
     *
     * @return static
     */
    public static function new(array $recipients, array $values, ?string $sender = null): self
    {
        return new self($recipients, 'Votre compte à bien été créé !', $values, $sender);
    }
}