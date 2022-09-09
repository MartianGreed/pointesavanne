<?php

namespace App\Domain\Customer\RecoverPassword;

use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Exception\CustomerNotFoundException;
use App\Domain\Mailer;

final class RecoverPasswordUseCase
{
    public function __construct(
        private readonly CustomerRepository $customerRepository,
        private readonly Mailer $mailer,
    )
    {
    }

    public function execute(RecoverPasswordRequest $request): RecoverPasswordResponse
    {
        $customer = $this->customerRepository->findCustomerByEmail($request->identifier);
        if (null === $customer) {
            throw new CustomerNotFoundException($request->identifier->getValue());
        }

        $customer->recoverPassword();
        $this->customerRepository->saveCustomer($customer);

        $this->mailer->addMessage(
            RecoverPasswordMail::new(
                [$customer->getEmail()],
                [
                    'token' => $customer->getRecoverPassword()?->getToken(),
                    'requested_at' => $customer->getRecoverPassword()?->getRequestedAt()->format('d/m/Y H:i:s'),
                    'expire_at' => $customer->getRecoverPassword()?->getExpireAt()->format('d/m/Y H:i:s'),
                    'firstname' => $customer->getProfile()->getFirstname(),
                    'lastname' => $customer->getProfile()->getLastname()
                ]
            )
        );

        return new RecoverPasswordResponse('An email has been sent, please check your inbox.');
    }
}