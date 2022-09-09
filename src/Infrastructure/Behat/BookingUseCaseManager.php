<?php

namespace App\Infrastructure\Behat;

use App\Domain\Booking\Quotation\QuotationRequest;
use App\Domain\Booking\Quotation\QuotationResponse;
use App\Domain\Booking\Quotation\QuotationUseCase;
use App\Domain\Booking\QuotationGeneration\QuotationGenerationRequest;
use App\Domain\Booking\QuotationGeneration\QuotationGenerationResponse;
use App\Domain\Booking\QuotationGeneration\QuotationGenerationUseCase;

final class BookingUseCaseManager
{
    public function __construct(
        private readonly QuotationUseCase $quotationUseCase,
        private readonly QuotationGenerationUseCase $generationUseCase,
    )
    {
    }

    public function requestQuotation(QuotationRequest $request): QuotationResponse
    {
        return $this->quotationUseCase->execute($request);
    }

    public function generateQuotation(QuotationGenerationRequest $request): QuotationGenerationResponse
    {
        return $this->generationUseCase->execute($request);
    }
}