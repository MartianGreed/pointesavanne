<?php

namespace App\Infrastructure\Behat;

use App\Domain\Booking\QuotationNumericIdGenerator;

final class InMemoryQuotationNumericIdGenerator implements QuotationNumericIdGenerator
{
    private int $generatedQuotations = 0;

    public function generateQuotationId(): int
    {
        return $this->generatedQuotations + 1;
    }
}