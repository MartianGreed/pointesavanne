<?php

namespace App\Domain\Shared\PDF;

final class File
{
    public function __construct(public readonly string $location)
    {
    }
}