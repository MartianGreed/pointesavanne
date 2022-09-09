<?php

namespace App\Domain\Shared;

use DateTime;
use RuntimeException;

final class DateUtils
{
    public static function getDate(string $date = 'now'): DateTime
    {
        $formatMatches = [];
        preg_match('/(?<datetime>\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}:\d{2})|(?<datewithtime>\d{2}\/\d{2}\/\d{4} \d{2}:\d{2})|(?<date>\d{2}\/\d{2}\/\d{4})/', $date, $formatMatches);

        if (0 === \count($formatMatches)) {
            $date = new DateTime($date);
            return $date->setTime((int)$date->format('H'), (int)$date->format('i'), (int)$date->format('s'), 0);
        }

        $matchedGroup = array_key_first(array_filter(static::getMatchingGroups($formatMatches), static fn(string $item) => '' !== $item));

        $format = match ($matchedGroup) {
            'date' => 'd/m/Y',
            'datewithtime' => 'd/m/Y H:i',
            'datetime' => 'd/m/Y H:i:s',
            default => throw new RuntimeException('Unsupported format.'),
        };

        $date = DateTime::createFromFormat($format, $date);
        if (!$date) {
            throw new \RuntimeException('Cannot parse date format '. $format);
        }

        if ('date' === $matchedGroup) {
            $date->setTime(0, 0, 0, 0);
        }

        return $date;
    }

    public static function getDateTime(string $dateTime): DateTime
    {
        return self::getDate($dateTime);
    }

    public static function isBefore(DateTime $date1, DateTime $date2, bool $include = false): bool
    {
        return match ($include) {
            true => 0 >= ($date1->getTimestamp() - $date2->getTimestamp()),
            false => 0 > ($date1->getTimestamp() - $date2->getTimestamp())
        };
    }

    public static function isAfter(DateTime $date1, DateTime $date2, bool $include = false): bool
    {
        return match ($include) {
            true => 0 <= ($date1->getTimestamp() - $date2->getTimestamp()),
            false => 0 < ($date1->getTimestamp() - $date2->getTimestamp())
        };
    }

    public static function isWithin(DateTime $date, DateTime $rangeFrom, DateTime $rangeTo, bool $withHead = false, bool $withTail = false): bool
    {
        return self::isAfter($date, $rangeFrom, $withHead) && self::isBefore($date, $rangeTo, $withTail);
    }

    /**
     * @param array{date?: string, datewithtime?: string, datetime?: string} $formatMatches
     * @return array{date: string, datewithtime: string, datetime: string}
     */
    private static function getMatchingGroups(array $formatMatches):array
    {
        return [
            'date' => array_key_exists('date', $formatMatches) ? $formatMatches['date'] : '',
            'datewithtime' => array_key_exists('datewithtime', $formatMatches) ? $formatMatches['datewithtime'] : '',
            'datetime' => array_key_exists('datetime', $formatMatches) ? $formatMatches['datetime'] : '',
        ];
    }
}