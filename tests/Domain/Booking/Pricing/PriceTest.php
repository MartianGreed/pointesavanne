<?php

namespace Test\Domain\Booking\Pricing;

use App\Domain\Booking\Pricing\Price;
use PHPUnit\Framework\TestCase;

final class PriceTest extends TestCase
{
    public function testPricesAreCorrectylConstructed(): void
    {
        $price = new Price(20);

        $this->assertSame('20,00 €', (string) $price);
        $this->assertSame(2000, $price->getValue());
        $this->assertSame('20,00', $price->getFormattedAmount());
        $this->assertSame('€', (string) $price->getCurrency());
    }
}