<?php

namespace App\Domain\Shared\File;

final class FileNotFoundException extends \DomainException
{
    public function __construct(string $path)
    {
        parent::__construct(sprintf('File not found at path : %s', $path));
    }
}