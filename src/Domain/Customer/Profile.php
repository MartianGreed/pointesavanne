<?php

namespace App\Domain\Customer;

final class Profile
{
    public function __construct(
        private string $firstname,
        private string $lastname,
        private string $phoneNumber,
        private ?string $language = null,
    )
    {
    }

    public function getFirstname(): string
    {
        return $this->firstname;
    }

    public function getLastname(): string
    {
        return $this->lastname;
    }

    public function getPhoneNumber(): string
    {
        return $this->phoneNumber;
    }

    public function getLanguage(): ?string
    {
        return $this->language;
    }

    public function setFirstname(string $firstname): void
    {
        $this->firstname = $firstname;
    }

    public function setLastname(string $lastname): void
    {
        $this->lastname = $lastname;
    }

    public function setPhoneNumber(string $phoneNumber): void
    {
        $this->phoneNumber = $phoneNumber;
    }

    public function setLanguage(string $language): void
    {
        $this->language = $language;
    }

    public function getFullname(): string
    {
        return $this->firstname . ' '. $this->lastname;
    }
}