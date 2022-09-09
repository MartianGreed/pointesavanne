<?php

namespace App\Domain\Booking\QuotationSigned;

use App\Domain\Mail;

final class QuotationSigned extends Mail
{
    public static function new(string $ownerEmail, string $from, string $to, string $customerName): self
    {
        return new self([$ownerEmail], sprintf('Devis signé - semaine du %s au %s - %s', $from, $to, $customerName), []);
    }
}
{

}