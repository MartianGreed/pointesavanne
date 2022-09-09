<?php
declare(strict_types=1);

namespace App\Domain\Customer\Register;

use App\Domain\Customer\Customer;
use App\Domain\Customer\CustomerId;
use App\Domain\Customer\CustomerRepository;
use App\Domain\Customer\Exception\CustomerAlreadyExistException;
use App\Domain\Customer\PasswordEncoder;
use App\Domain\Mailer;

final class RegistrationUseCase
{
    public function __construct(
        private readonly PasswordEncoder $encoder,
        private readonly CustomerRepository $customerRepository,
        private readonly Mailer $mailer,
    )
    {
    }

    public function execute(RegistrationRequest $request): RegistrationResponse
    {
        $encodedPassword = $this->encoder->encode($request->password);

        if ($this->customerRepository->doesCustomerWithEmailExists($request->email->getValue())) {
            $exception = new CustomerAlreadyExistException($request->email->getValue());

            return new RegistrationResponse(null, [$exception->getMessage()]);
        }

        $customer = Customer::register(CustomerId::build(), $request->email, $encodedPassword, $request->phoneNumber, $request->firstname, $request->lastname);

        $this->customerRepository->saveCustomer($customer);
        // @TODO: Send a confirmation email to the user
        $this->mailer->addMessage(RegisterMail::new([$customer->getEmail()], []));
        $this->mailer->send();

        return new RegistrationResponse($customer);
    }
}