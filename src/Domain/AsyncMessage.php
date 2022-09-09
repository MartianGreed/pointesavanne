<?php

namespace App\Domain;

interface AsyncMessage
{
    public function dispatch(Message $message): void;
}