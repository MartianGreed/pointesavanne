<?php

namespace App\Domain\Customer\RecoverPassword;

use App\Domain\Mail;

final class RecoverPasswordMail extends Mail
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
        return new self($recipients, 'Réinitialisation de votre mot de passe', $values, $sender);
    }
}