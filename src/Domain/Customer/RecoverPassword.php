<?php

namespace App\Domain\Customer;

use App\Domain\UuidGenerator;

final class RecoverPassword
{
    private function __construct(
        private readonly string $token,
        private readonly \DateTime $requestedAt,
        private readonly \DateTime $expireAt,
    )
    {}

    public static function recordNow(?string $token = null): self
    {
        $now = new \DateTime('now');

        return new self($token ?? UuidGenerator::v4(), $now, clone $now->add(new \DateInterval('P1D')));
    }

    public function getToken(): string
    {
        return $this->token;
    }

    public function getRequestedAt(): \DateTime
    {
        return $this->requestedAt;
    }

    public function getExpireAt(): \DateTime
    {
        return $this->expireAt;
    }
}