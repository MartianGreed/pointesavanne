<?php

namespace App\Infrastructure\Behat;

use App\Domain\Booking\Quotation\QuotationDTO;
use App\Domain\Shared\PDF\PdfContent;

final class QuotationSignedPDF extends PdfContent
{
    public static function generate(string $bookingId, QuotationDTO $quotation): self
    {
        return new self(
            'pdf/quotation',
            'booking/'.$bookingId.'/devis-signe.pdf',
            $quotation->toArray()
        );
    }

}