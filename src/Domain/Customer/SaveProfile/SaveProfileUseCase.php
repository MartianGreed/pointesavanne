<?php

namespace App\Domain\Customer\SaveProfile;

use App\Domain\Customer\Address;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Exception\CustomerNotFoundException;

final class SaveProfileUseCase
{
    public function __construct(
        private readonly CustomerRepository $customerRepository,
    )
    {
    }

    public function execute(SaveProfileRequest $request): SaveProfileResponse
    {
        $customer = $this->customerRepository->findCustomerByEmail($request->email);
        if (null === $customer) {
            throw new CustomerNotFoundException($request->email->getValue());
        }

        $address = null;
        if (null !== $request->line1 && null !== $request->line3) {
            $address = new Address($request->line1, $request->line3, $request->line2);
        }
        $customer = $customer->updateProfile($address, $request->firstname, $request->lastname, $request->phoneNumber, $request->language);
        $this->customerRepository->saveCustomer($customer);

        return new SaveProfileResponse($customer);
    }
}