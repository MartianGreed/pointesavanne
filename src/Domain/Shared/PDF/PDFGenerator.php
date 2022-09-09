<?php

namespace App\Domain\Shared\PDF;

interface PDFGenerator
{
    public function generate(PdfContent $content): File;
}