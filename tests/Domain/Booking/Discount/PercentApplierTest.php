<?php

namespace Test\Domain\Booking\Discount;

use App\Domain\Booking\Discount\DiscountAmount;
use App\Domain\Booking\Pricing\Price;
use PHPUnit\Framework\TestCase;

final class PercentApplierTest extends TestCase
{
    public function testApply(): void
    {
        $this->assertEquals(new Price(5), DiscountAmount::parse('50%')->apply(new Price(10)));
        $this->assertEquals(new Price(90), DiscountAmount::parse('10%')->apply(new Price(100)));

        $this->assertEquals(new Price(1881), DiscountAmount::parse('10%')->apply(new Price(2090)));
        $this->assertEquals(new Price(1701), DiscountAmount::parse('10%')->apply(new Price(1890)));
    }
}