<?php

namespace App\Domain\Booking;

enum Status: string
{
    case QUOTATION_REQUESTED = 'quotation-requested';
    case QUOTATION_AWAITING_ACCEPTATION = 'quotation-awaiting-acceptation';
    case QUOTATION_SIGNED = 'quotation-signed';
}