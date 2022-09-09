<?php

namespace App\Domain\Customer\UpdatePassword;

use App\Domain\Customer\AuthenticationGateway;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\PasswordEncoder;

final class UpdatePasswordUseCase
{
    public function __construct(
        private readonly CustomerRepository $customerRepository,
        private readonly AuthenticationGateway $authenticationGateway,
        private readonly PasswordEncoder $encoder
    )
    {
    }

    public function execute(UpdatePasswordRequest $request): UpdatePasswordResponse
    {
        $strategy = $request->getStrategy($this->customerRepository, $this->authenticationGateway, $this->encoder);

        $customer = $strategy->updateFromRequest($request);

        return new UpdatePasswordResponse('Password successfully updated', $customer);
    }
}