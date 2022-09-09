<?php

namespace App\Domain\Booking\QuotationGeneration;

use App\Domain\Booking\Quotation\QuotationDTO;
use App\Domain\Shared\PDF\PdfContent;

final class QuotationPDF extends PdfContent
{
    public static function generate(string $bookingId, QuotationDTO $quotation): self
    {
        return new self(
            'pdf/quotation',
            'booking/'.$bookingId.'/devis.pdf',
            $quotation->toArray()
        );
    }

}