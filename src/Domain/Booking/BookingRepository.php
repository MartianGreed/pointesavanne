<?php

namespace App\Domain\Booking;

interface BookingRepository
{
    public function isBookingAvailable(FormattedBookingDates $bookingDates): bool;

    public function save(Booking $booking): bool;

    public function findBookingById(BookingId $bookingId): ?Booking;
}