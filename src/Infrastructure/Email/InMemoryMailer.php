<?php

namespace App\Infrastructure\Email;

use App\Domain\Customer\Profile;
use App\Domain\Mail;
use App\Domain\Mailer;

final class InMemoryMailer implements Mailer
{
    /** @var array<Mail> */
    private array $toSend = [];
    /** @var array<Mail> */
    private array $sent = [];
    /** @var array<Mail> */
    private array $sentHistory = [];

    public function __construct(private readonly string $sender)
    {
    }

    public function addMessage(Mail $mail): void
    {
        $this->toSend[] = $mail;
    }

    public function send(): int
    {
        // This condition is used to keep track of sent emails in order to check they have properly been sent in testing
        if (!empty($this->sent)) {
            $this->sentHistory = array_merge($this->sentHistory, $this->sent);
            $this->sent = [];
        }

        foreach ($this->toSend as $key => $mail) {
            unset($this->toSend[$key]);

            if (null === $mail->getSender()) {
                $mail->setSender($this->sender);
            }

            $this->sent[] = $mail;
        }

        return \count($this->sent);
    }

    /** @return array<Mail> */
    public function getSent(): array
    {
        return $this->sent;
    }
}