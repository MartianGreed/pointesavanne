export class File {
  constructor(
    public readonly name: string,
    public readonly content: Uint8Array,
    public readonly mimeType: string = 'application/pdf'
  ) {}
}
