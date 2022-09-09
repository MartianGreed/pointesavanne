<?php

namespace App\Domain\Customer;

interface AuthenticationGateway
{
    public function isCustomerLoggedIn(string $sessionId): bool;
    public function getCustomer(string $sessionId): Customer;
    public function logCustomerIn(Customer $customer): string;

    public function getCurrentLoggedInCustomer(): Customer;
}