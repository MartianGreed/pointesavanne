<?php

namespace App\Domain;

use App\Domain\Shared\File\FileNotFoundException;
use App\Domain\Shared\PDF\File;

interface FileLocator
{
    public function save(File $file, string $content): bool;

    /** @throws FileNotFoundException */
    public function locate(string $path): File;

    public function getContent(File $file): mixed;
}