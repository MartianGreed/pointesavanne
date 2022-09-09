<?php

namespace App\Domain\Booking\Pricing;

final class Price
{
    public readonly int $value;

    public function __construct(public readonly float $amount, private readonly Currency $currency = new Euro())
    {
        $this->value = (int) ($amount * 100);
    }

    public function getValue(): int
    {
        return $this->value;
    }

    public function getFormattedAmount(): string
    {
        return number_format($this->amount, 2, ',', ' ');
    }

    public function getCurrency(): string
    {
        return (string) $this->currency;
    }

    public function __toString(): string
    {
        return sprintf('%s %s',
            $this->getFormattedAmount(),
            $this->currency
        );
    }

    public function sub(Price $other): self
    {
        return new Price($this->amount - $other->amount);
    }

    public function getUnitPrice(): self
    {
        return new Price($this->amount / 7);
    }

    public function add(Price $other): Price
    {
        return new Price($this->amount + $other->amount);
    }
}