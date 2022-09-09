<?php

namespace App\Infrastructure\Behat;

use App\Domain\AsyncMessage;
use App\Domain\Message;

final class InMemoryMessageQueue implements AsyncMessage
{
    /** @var array<Message> */
    private array $dispatchedMessages = [];

    public function dispatch(Message $message): void
    {
        $this->dispatchedMessages[] = $message;
    }

    /** @return array<Message> */
    public function getDispatchedMessages(): array
    {
        return $this->dispatchedMessages;
    }
}