<?php

namespace Test\Domain\Booking\Discount;

use App\Domain\Booking\Discount\DiscountAmount;
use PHPUnit\Framework\TestCase;

final class DiscountAmountTest extends TestCase
{
    public function testItProperlyParsesStrings(): void
    {
        $this->assertEquals(new DiscountAmount(10,'%'), DiscountAmount::parse('10%'));
        $this->assertEquals(new DiscountAmount(50,'%'), DiscountAmount::parse('50 %'));
        $this->assertEquals(new DiscountAmount(50,'€'), DiscountAmount::parse('50 €'));
        $this->assertEquals(new DiscountAmount(1200,'€'), DiscountAmount::parse('1200€'));
        $this->assertEquals(new DiscountAmount(1200,'€'), DiscountAmount::parse('1 200 €'));
    }
}