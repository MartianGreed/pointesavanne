<?php

namespace App\Infrastructure\Behat;

use App\Domain\Booking\Booking;
use App\Domain\Booking\BookingId;
use App\Domain\Booking\BookingRepository;
use App\Domain\Booking\FormattedBookingDates;
use App\Domain\Shared\DateUtils;

final class InMemoryBookingRepository implements BookingRepository
{
    /** @var Booking[]  */
    private array $bookings = [];

    public function isBookingAvailable(FormattedBookingDates $bookingDates): bool
    {
        if (empty($this->bookings)) {
            return true;
        }

        $from = DateUtils::getDate($bookingDates->from);
        $to = DateUtils::getDate($bookingDates->to);
        foreach ($this->bookings as $booking) {
            if (
                (DateUtils::isAfter($from, $booking->getFrom()) && DateUtils::isBefore($from, $booking->getTo()))
                || (DateUtils::isAfter($to, $booking->getFrom()) && DateUtils::isBefore($to, $booking->getTo()))
            ) {
                return false;
            }
        }

        return true;
    }

    public function save(Booking $booking): bool
    {
        if (!in_array($booking, $this->bookings, true)) {
            $this->bookings[] = $booking;
            return true;
        }

        return false;
    }

    public function findBookingById(BookingId $bookingId): ?Booking
    {
        $booking = array_filter($this->bookings, static fn (Booking $b) => $b->getId() === $bookingId->toString());
        if (0 === \count($booking)) {
            return null;
        }

        return array_shift($booking);
    }
}