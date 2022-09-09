<?php

namespace App\Domain\Customer\UpdatePassword;

use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Email;
use App\Domain\Customer\Exception\InvalidUpdatePasswordRequestException;
use App\Domain\Customer\Exception\NoUpdatePasswordStrategyFound;
use App\Domain\Customer\PasswordEncoder;

final class UpdatePasswordRequest
{
    public function __construct(
        public readonly ?Email $email = null,
        public readonly ?string $old = null,
        public readonly ?string $new = null,
        public readonly ?string $token = null
    )
    {
        if (
            (null === $this->email && null === $this->old && null === $this->token)
            || (null === $this->email && null === $this->token)
            || (null === $this->token && null === $this->new)
        ) {
            throw new InvalidUpdatePasswordRequestException();
        }
    }

    public function getStrategy(
        CustomerRepository $customerRepository,
        AuthenticationGateway $authenticationGateway,
        PasswordEncoder $encoder
    ): PasswordUpdater {
        if (null !== $this->email && (null !== $this->new && null !== $this->old)) {
            return new EmailStrategy($customerRepository, $authenticationGateway, $encoder);
        }

        if (null !== $this->token && null !== $this->new) {
            return new TokenStrategy($customerRepository, $authenticationGateway, $encoder);
        }

        throw new NoUpdatePasswordStrategyFound();
    }
}