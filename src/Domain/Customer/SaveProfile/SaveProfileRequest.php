<?php

namespace App\Domain\Customer\SaveProfile;

use App\Domain\Customer\Email;

final class SaveProfileRequest
{
    public function __construct(
        public readonly Email $email,
        public readonly ?string $firstname = null,
        public readonly ?string $lastname = null,
        public readonly ?string $phoneNumber = null,
        public readonly ?string $language = null,
        public readonly ?string $line1 = null,
        public readonly ?string $line2 = null,
        public readonly ?string $line3 = null,
    )
    {
    }
}