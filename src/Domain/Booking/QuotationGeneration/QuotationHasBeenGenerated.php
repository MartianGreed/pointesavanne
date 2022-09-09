<?php

namespace App\Domain\Booking\QuotationGeneration;

use App\Domain\Mail;

final class QuotationHasBeenGenerated extends Mail
{
    /**
     * @param string               $recipient
     * @param array<string, mixed> $values
     *
     * @return static
     */
    public static function new(string $recipient, array $values = []): self
    {
        return new self([$recipient], 'Location Pointe-Savanne - Devis', $values);
    }
}