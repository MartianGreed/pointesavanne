<?php

namespace App\Infrastructure\PDF;

use App\Domain\FileLocator;
use App\Domain\Shared\PDF\File;
use App\Domain\Shared\PDF\PdfContent;
use App\Domain\Shared\PDF\PDFGenerator;
use Dompdf\Dompdf;
use Twig\Environment;

final class DOMPdfGenerator implements PDFGenerator
{
    public function __construct(
        private readonly Environment $twig,
        private readonly FileLocator $fileLocator,
    )
    {}

    public function generate(PdfContent $content): File
    {
        $dompdf = new Dompdf();
        $dompdf->loadHtml($this->twig->render($content->baseFileName.'.html.twig', $content->data));
        $dompdf->render();

        $file = new File($content->outputFileName);
        $this->fileLocator->save($file, (string)$dompdf->output());

        return $file;
    }
}