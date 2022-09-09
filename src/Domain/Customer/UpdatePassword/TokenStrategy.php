<?php

namespace App\Domain\Customer\UpdatePassword;

use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\Customer;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Exception\CustomerNotFoundException;
use App\Domain\Customer\PasswordEncoder;

final class TokenStrategy implements PasswordUpdater
{
    public function __construct(
        private readonly CustomerRepository $customerRepository,
        // @phpstan-ignore-next-line
        private readonly AuthenticationGateway $authenticationGateway,
        private readonly PasswordEncoder $encoder,
    )
    {
    }

    public function updateFromRequest(UpdatePasswordRequest $request): Customer
    {
        $customer = $this->customerRepository->findCustomerByResetToken((string) $request->token);
        if (null === $customer) {
            throw new CustomerNotFoundException((string) $request->token);
        }

        return $customer->updatePassword($this->encoder->encode((string) $request->new));
    }
}