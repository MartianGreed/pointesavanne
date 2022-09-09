<?php

namespace App\Domain;

interface Mailer
{
    public function addMessage(Mail $mail): void;

    public function send(): int;
}