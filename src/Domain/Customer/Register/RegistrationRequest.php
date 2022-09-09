<?php
declare(strict_types=1);

namespace App\Domain\Customer\Register;

use App\Domain\Customer\Email;
use Webmozart\Assert\Assert;

final class RegistrationRequest
{
    public readonly Email $email;

    public function __construct(
        string $email,
        public readonly string $password,
        public readonly string $phoneNumber,
        public readonly string $firstname,
        public readonly string $lastname
    )
    {
        $this->email = new Email($email);

        Assert::minLength($this->password, 8, 'Password is too short. Password has to be 8 chars min');
        Assert::regex($this->phoneNumber, '/^(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})$/');
    }
}