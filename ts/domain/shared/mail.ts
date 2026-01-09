export abstract class Mail {
  private sender: string | null = null
  private attachments: Record<string, unknown> = {}

  protected constructor(
    private readonly recipients: string[],
    private readonly title: string,
    private readonly values: Record<string, unknown>
  ) {}

  setSender(sender: string): this {
    this.sender = sender
    return this
  }

  getSender(): string | null {
    return this.sender
  }

  getRecipients(): string[] {
    return this.recipients
  }

  getTitle(): string {
    return this.title
  }

  getValues(): Record<string, unknown> {
    return this.values
  }

  getAttachments(): Record<string, unknown> {
    return this.attachments
  }
}
