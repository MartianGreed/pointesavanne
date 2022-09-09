<?php

namespace App\Domain\Customer;

use Webmozart\Assert\Assert;

final class Customer
{
    private CustomerId $id;
    private Email $email;
    private ?string $password;

    private Profile $profile;
    private ?Address $address = null;
    private Roles $roles;
    private ?RecoverPassword $recoverPasswordRequest = null;

    private \DateTime $createdAt;
    private \DateTime $updatedAt;
    private ?\DateTime $lastLoginAt;


    private function __construct()
    {

        $this->lastLoginAt = null;
    }

    public static function register(CustomerId $id, Email $email, string $password, string $phoneNumber, string $firstname, string $lastname): self
    {
        $customer = new self();

        Assert::regex($phoneNumber, '/^(?:(?:\+|00)33[\s.-]{0,3}(?:\(0\)[\s.-]{0,3})?|0)[1-9](?:(?:[\s.-]?\d{2}){4}|\d{2}(?:[\s.-]?\d{3}){2})$/');
        $customer->id = $id;
        $customer->email = $email;
        $customer->password = $password;
        $customer->profile = new Profile($firstname, $lastname, $phoneNumber);
        $customer->roles = Roles::default();

        $registrationDate = new \DateTime('now');
        $customer->createdAt = $registrationDate;
        $customer->updatedAt = $registrationDate;

        return $customer;
    }

    public function logIn(): self
    {
        $this->lastLoginAt = new \DateTime('now');

        return $this;
    }

    public function updateProfile(?Address $address = null, ?string $firstname = null, ?string $lastname = null, ?string $phoneNumber = null, ?string $language = null): self
    {
        if (null !== $firstname && $firstname !== $this->profile->getFirstname()) {
            $this->profile->setFirstname($firstname);
        }

        if (null !== $lastname && $lastname !== $this->profile->getLastname()) {
            $this->profile->setLastname($lastname);
        }

        if (null !== $phoneNumber && $phoneNumber !== $this->profile->getPhoneNumber()) {
            $this->profile->setPhoneNumber($phoneNumber);
        }

        if (null !== $language && $language !== $this->profile->getLanguage()) {
            $this->profile->setLanguage($language);
        }

        if (null !== $address) {
            $this->address = $address;
        }


        $this->updatedAt = new \DateTime('now');

        return $this;
    }

    public function recoverPassword(?string $token = null): void
    {
        $this->recoverPasswordRequest = RecoverPassword::recordNow($token);
    }

    public function updatePassword(string $encoded): self
    {
        $this->password = $encoded;
        $this->updatedAt = new \DateTime('now');

        $this->recoverPasswordRequest = null;

        return $this;
    }

    public function getId(): CustomerId
    {
        return $this->id;
    }

    public function getRoles(): Roles
    {
        return $this->roles;
    }

    public function getRecoverPasswordRequest(): ?RecoverPassword
    {
        return $this->recoverPasswordRequest;
    }

    public function getCreatedAt(): \DateTime
    {
        return $this->createdAt;
    }

    public function getUpdatedAt(): \DateTime
    {
        return $this->updatedAt;
    }

    public function getLastLoginAt(): ?\DateTime
    {
        return $this->lastLoginAt;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getPassword(): ?string
    {
        return $this->password;
    }

    public function getProfile(): Profile
    {
        return $this->profile;
    }

    public function getRecoverPassword(): ?RecoverPassword
    {
        return $this->recoverPasswordRequest;
    }

    public function getAddress(): ?Address
    {
        return $this->address;
    }
}