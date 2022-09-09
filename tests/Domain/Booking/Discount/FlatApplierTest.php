<?php

namespace Test\Domain\Booking\Discount;

use App\Domain\Booking\Discount\DiscountAmount;
use App\Domain\Booking\Pricing\Price;
use PHPUnit\Framework\TestCase;

final class FlatApplierTest extends TestCase
{
    public function testApply(): void
    {
        $this->assertEquals(new Price(5), DiscountAmount::parse('5€')->apply(new Price(10)));
        $this->assertEquals(new Price(95), DiscountAmount::parse('5€')->apply(new Price(100)));
        $this->assertEquals(new Price(0), DiscountAmount::parse('5€')->apply(new Price(5)));

        $this->assertEquals(new Price(.5), DiscountAmount::parse('0.5€')->apply(new Price(1)));
        $this->assertEquals(new Price(.01), DiscountAmount::parse('0.99€')->apply(new Price(1)));
    }
}