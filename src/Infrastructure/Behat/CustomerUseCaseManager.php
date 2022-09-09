<?php

namespace App\Infrastructure\Behat;

use App\Domain\Customer\Register\RegistrationRequest;
use App\Domain\Customer\Register\RegistrationResponse;
use App\Domain\Customer\Register\RegistrationUseCase;
use App\Domain\Customer\SaveProfile\SaveProfileRequest;
use App\Domain\Customer\SaveProfile\SaveProfileResponse;
use App\Domain\Customer\SaveProfile\SaveProfileUseCase;

final class CustomerUseCaseManager
{
    public function __construct(
        private readonly RegistrationUseCase $registrationUseCase,
        private readonly SaveProfileUseCase $saveProfileUseCase,
    )
    {
    }

    public function register(RegistrationRequest $request): RegistrationResponse
    {
        return $this->registrationUseCase->execute($request);
    }

    public function saveProfile(SaveProfileRequest $request): SaveProfileResponse
    {
        return $this->saveProfileUseCase->execute($request);
    }
}