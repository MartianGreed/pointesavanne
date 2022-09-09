<?php

namespace App\Domain\Booking\Quotation;

use App\Domain\Mail;

final class NewQuotationRequest extends Mail
{
    /**
     * @param string               $recipient
     * @param array<string, mixed> $values
     * @param string|null          $sender
     *
     * @return static
     */
    public static function new(string $recipient, array $values, ?string $sender = null): self
    {
        return new self([$recipient], 'Nouvelle demande de devis', $values, $sender);
    }
}