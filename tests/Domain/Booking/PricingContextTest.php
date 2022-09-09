<?php

namespace Test\Domain\Booking;

use App\Domain\Booking\Discount\Discount;
use App\Domain\Booking\Discount\DiscountAmount;
use App\Domain\Booking\Pricing\Price;
use App\Domain\Booking\Pricing\PriceParser;
use App\Domain\Booking\Pricing\PriceRange;
use App\Domain\Booking\Pricing\Range;
use App\Domain\Booking\PricingContext;
use App\Domain\Booking\Villa;
use App\Domain\Shared\DateUtils;
use PHPUnit\Framework\TestCase;

final class PricingContextTest extends TestCase
{
    /** @var array<array{from: string, to: string, amount: string}>  */
    private array $ranges = [
        [
            'from' => '05/03/2022',
            'to' => '06/05/2022',
            'amount' => '1890 €',
        ],
        [
            'from' => '07/05/2022',
            'to' => '01/07/2022',
            'amount' => '1600 €',
        ],
        [
            'from' => '02/07/2022',
            'to' => '26/08/2022',
            'amount' => '1700 €',
        ],
        [
            'from' => '27/08/2022',
            'to' => '21/10/2022',
            'amount' => '1600 €',
        ],
        [
            'from' => '22/10/2022',
            'to' => '16/12/2022',
            'amount' => '1700 €',
        ],
        [
            'from' => '17/12/2022',
            'to' => '01/01/2023',
            'amount' => '2090 €',
        ],
        [
            'from' => '02/01/2023',
            'to' => '03/02/2023',
            'amount' => '1890 €',
        ],
        [
            'from' => '04/02/2023',
            'to' => '03/03/2023',
            'amount' => '2090 €',
        ],
        [
            'from' => '04/03/2023',
            'to' => '05/05/2023',
            'amount' => '1890 €',
        ],
        [
            'from' => '06/05/2023',
            'to' => '30/06/2023',
            'amount' => '1600 €',
        ],
        [
            'from' => '01/07/2023',
            'to' => '25/08/2023',
            'amount' => '1700 €',
        ],
        [
            'from' => '26/08/2023',
            'to' => '20/10/2023',
            'amount' => '1600 €',
        ],
        [
            'from' => '21/10/2023',
            'to' => '15/12/2023',
            'amount' => '1700 €',
        ],
        [
            'from' => '16/12/2023',
            'to' => '31/12/2023',
            'amount' => '2090 €',
        ],
    ];

    private Villa $villa;

    public function setUp(): void
    {
        $priceParser = new PriceParser();

        $this->villa = new Villa(
            'Villa de standing - Pointe savanne',
            $priceParser->parse('2 000 €'),
            $priceParser->parse('200 €')
        );

        $priceRange = new PriceRange();
        foreach ($this->ranges as $range) {
            $priceRange->addRange(new Range(DateUtils::getDate($range['from']), DateUtils::getDate($range['to']), $priceParser->parse($range['amount'])));
        }

        $discount = new Discount();
        $discount
            ->addRange(new \App\Domain\Booking\Discount\Range(8, 14, DiscountAmount::parse('10%')))
            ->addRange(new \App\Domain\Booking\Discount\Range(15, 21, DiscountAmount::parse('15%')))
        ;

        $this->villa->setPriceRange($priceRange)->setDiscount($discount);
    }

    public function testItCanCreatePricingContext(): void
    {
        $context = PricingContext::create($this->villa, DateUtils::getDate('30/05/2022'), DateUtils::getDate('13/06/2022'));

        $expectedPrice = new Price(3040);

        $this->assertCount(14, $context->getPrices());
        $this->assertSame((string)$expectedPrice, (string) $context->getTotalAmount());

        // Expect to recompute the price every time but amount have to remain the same
        $this->assertEquals($context->getTotalAmount(), $context->getTotalAmount());
        $this->assertNotSame($context->getTotalAmount(), $context->getTotalAmount());
    }

    public function testItProperlyCreatesContextForAThreeWeeksTrip(): void
    {
        $context = PricingContext::create($this->villa, DateUtils::getDate('06/02/2023'), DateUtils::getDate('27/02/2023'));

        $expectedPrice = new Price(5747.5);

        $this->assertCount(21, $context->getPrices());
        $this->assertSame((string)$expectedPrice, (string) $context->getTotalAmount());
    }

    public function testItCalculatesPricesOnOverlappingPeriods(): void
    {
        $context = PricingContext::create($this->villa, DateUtils::getDate('29/06/2022'), DateUtils::getDate('06/07/2022'));
        $expectedPrice = new Price(1657.14);

        $this->assertCount(7, $context->getPrices());
        $this->assertSame((string)$expectedPrice, (string) $context->getTotalAmount());
    }
}