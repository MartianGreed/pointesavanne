<?php

namespace App\Domain\Booking\Pricing;

use App\Domain\Booking\Exception\UnsupportedCurrencyException;

final class PriceParser
{
    /**
     * @var Currency[]
     */
    private array $currencies;

    public function __construct()
    {
        $this->currencies = [
            new Euro(),
        ];
    }

    public function parse(string $humanPrice): Price
    {
        $sanitizedString = str_replace(' ', '', $humanPrice);
        $amount = (float) substr(str_replace(',', '.', $sanitizedString), 0, -3);
        $currencySymbol = preg_replace(['/\d+/', '/,/', '/\./'], '', $sanitizedString);
        $currency = $this->getCurrency((string) $currencySymbol);

        return new Price($amount, $currency);
    }

    private function getCurrency(string $symbol): Currency
    {
        $currencies = array_filter($this->currencies, static fn (Currency $c) => $symbol === $c->symbol);
        if (empty($currencies)) {
            throw new UnsupportedCurrencyException($symbol);
        }

        return array_shift($currencies);
    }
}