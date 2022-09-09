<?php

namespace Test\Domain\Booking\Pricing;

use App\Domain\Booking\Exception\UnsupportedCurrencyException;
use App\Domain\Booking\Pricing\Price;
use App\Domain\Booking\Pricing\PriceParser;
use PHPUnit\Framework\TestCase;

final class PriceParserTest extends TestCase
{
    private PriceParser $parser;

    public function setUp(): void
    {
        $this->parser = new PriceParser();
    }
    
    public function testItCanParsePrices(): void
    {
        $this->assertEquals(new Price(1890), $this->parser->parse('1 890 €'));
        $this->assertEquals(new Price(17.5), $this->parser->parse('17,50 €'));

        $this->expectException(UnsupportedCurrencyException::class);
        $this->parser->parse('18 $');
    }
}