<?php

namespace App\Domain;

abstract class Mail
{
    protected function __construct(
        /** @var list<string> */
        private readonly array $recipients,
        private readonly string $title,
        /** @var array<string, mixed> */
        private readonly array $values,
        private ?string $sender = null,
        /** @var array<string, mixed> */
        private array $attachments = [],
    ) {
    }

    public function setSender(string $sender): self
    {
        $this->sender = $sender;
        return $this;
    }

    public function getSender(): ?string
    {
        return $this->sender;
    }

    /** @return array<string> */
    public function getRecipients(): array
    {
        return $this->recipients;
    }

    public function getTitle(): string
    {
        return $this->title;
    }

    /** @return array<string, mixed> */
    public function getValues(): array
    {
        return $this->values;
    }

    /** @return array<string, mixed> */
    public function getAttachments(): array
    {
        return $this->attachments;
    }
}