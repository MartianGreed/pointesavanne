<?php

namespace App\Domain\Booking\Exception;

use App\Domain\Booking\Pricing\Range;

final class OverlappingPriceRangeException extends \DomainException
{
    public function __construct(Range $range)
    {
        parent::__construct(sprintf(
            'Range is overlapping with existant range between %s and %s',
            $range->from->format('d/m/Y'),
            $range->to->format('d/m/Y')
        ));
    }
}