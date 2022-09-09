<?php

namespace App\Domain\Booking;

interface QuotationNumericIdGenerator
{
    public function generateQuotationId(): int;
}