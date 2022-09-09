<?php

namespace Test\Domain\Shared;

use App\Domain\Shared\DateUtils;
use Cassandra\Date;
use PHPUnit\Framework\TestCase;

final class DateUtilsTest extends TestCase
{
    public function test_getDate(): void
    {
        $this->assertEquals(new \DateTime('2022-03-02'), DateUtils::getDate('2022-03-02'));
        $this->assertEquals(new \DateTime('2022-03-02 10:00:00'), DateUtils::getDate('2022-03-02 10:00:00'));
        $this->assertEquals(new \DateTime('2022-01-02'), DateUtils::getDate('02/01/2022'));
        $this->assertEquals(new \DateTime('2022-01-02 12:30:00'), DateUtils::getDate('02/01/2022 12:30:00'));

        $this->assertEquals(new \DateTime('2023-08-26'), DateUtils::getDate('2023-08-26'));
        $this->assertEquals(new \DateTime('26-08-2023'), DateUtils::getDate('26/08/2023'));

        $this->assertEquals(new \DateTime('2022-06-04'), DateUtils::getDate('04/06/2022'));
    }

    public function test_getDatetime(): void
    {
        $this->assertEquals(new \DateTime('2022-03-02 10:00:00'), DateUtils::getDateTime('2022-03-02 10:00:00'));
        $this->assertEquals(new \DateTime('2022-01-02 12:30:00'), DateUtils::getDateTime('02/01/2022 12:30:00'));
        $this->assertEquals(new \DateTime('12:30:00'), DateUtils::getDateTime('12:30:00'));
    }

    public function testIsBefore(): void
    {
        $this->assertTrue(DateUtils::isBefore(DateUtils::getDate('01/01/2022'), DateUtils::getDate('02/01/2022')));

        $this->assertTrue(DateUtils::isBefore(DateUtils::getDate('01/01/2022 12:00:00'), DateUtils::getDate('01/01/2022 12:00:01')));
        $this->assertFalse(DateUtils::isBefore(DateUtils::getDate('01/01/2022 12:00:00'), DateUtils::getDate('01/01/2022 11:59:59')));
    }

    public function testIsAfter(): void
    {
        $this->assertFalse(DateUtils::isAfter(DateUtils::getDate('01/01/2022'), DateUtils::getDate('02/01/2022')));

        $this->assertFalse(DateUtils::isAfter(DateUtils::getDate('01/01/2022 12:00:00'), DateUtils::getDate('01/01/2022 12:00:01')));
        $this->assertTrue(DateUtils::isAfter(DateUtils::getDate('01/01/2022 12:00:00'), DateUtils::getDate('01/01/2022 11:59:59')));
    }
}