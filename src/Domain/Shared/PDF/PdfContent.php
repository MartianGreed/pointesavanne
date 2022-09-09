<?php

namespace App\Domain\Shared\PDF;

abstract class PdfContent
{

    protected function __construct(
        public readonly string $baseFileName,
        public readonly string $outputFileName,
        /** @var array<string, mixed> */
        public readonly array $data = []
    ) {}
}