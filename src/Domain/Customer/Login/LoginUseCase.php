<?php

namespace App\Domain\Customer\Login;

use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Exception\CustomerNotFoundException;
use App\Domain\Customer\PasswordEncoder;

final class LoginUseCase
{
    public function __construct(
        private readonly CustomerRepository $customerRepository,
        private readonly PasswordEncoder $encoder,
        private readonly AuthenticationGateway $authenticationGateway,
    ) {
    }

    public function execute(LoginRequest $login): LoginResponse
    {
        $customer = $this->customerRepository->findCustomerByEmail($login->email);
        if (null === $customer) {
            throw new CustomerNotFoundException($login->email->getValue());
        }

        if (!$this->encoder->check((string) $customer->getPassword(), $login->plainPassword)) {
            return new LoginResponse(null, ['Invalid credentials']);
        }

        $this->customerRepository->saveCustomer($customer->logIn());

        $sessionId = $this->authenticationGateway->logCustomerIn($customer);

        return new LoginResponse($sessionId);
    }
}