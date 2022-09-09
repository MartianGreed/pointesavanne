<?php

namespace App\Domain\Customer\UpdatePassword;

use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\Customer;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Exception\CustomerNotFoundException;
use App\Domain\Customer\Exception\InvalidCredentialsException;
use App\Domain\Customer\PasswordEncoder;
use App\Domain\Shared\Exception\ForbiddenException;

final class EmailStrategy implements PasswordUpdater
{
    public function __construct(
        private readonly CustomerRepository $customerRepository,
        private readonly AuthenticationGateway $authenticationGateway,
        private readonly PasswordEncoder $encoder,
    )
    {
    }

    public function updateFromRequest(UpdatePasswordRequest $request): Customer
    {
        if (null === $request->email) {
            throw new \DomainException('Email cannot be null');
        }

        $customer = $this->customerRepository->findCustomerByEmail($request->email);
        if (null === $customer) {
            throw new CustomerNotFoundException((string) $request->email);
        }

        if (!$this->encoder->check((string) $customer->getPassword(), (string) $request->old)) {
            throw new InvalidCredentialsException();
        }

        $currentLoggedInCustomer = $this->authenticationGateway->getCurrentLoggedInCustomer();
        if ($customer->getEmail() !== $currentLoggedInCustomer->getEmail()) {
            throw new ForbiddenException('Cannot update other customers password.');
        }

        return $customer->updatePassword($this->encoder->encode((string) $request->new));
    }
}