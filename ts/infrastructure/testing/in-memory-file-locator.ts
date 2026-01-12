import { FileNotFoundException } from '../../domain/shared/exception/file-not-found.ts'
import type { FileLocator } from '../../domain/shared/file-locator.ts'

export class InMemoryFileLocator implements FileLocator {
  private files: Map<string, string | Uint8Array> = new Map()

  async save(location: string, content: string | Uint8Array): Promise<boolean> {
    this.files.set(location, content)
    return true
  }

  async locate(path: string): Promise<string> {
    if (!this.files.has(path)) {
      throw new FileNotFoundException(path)
    }
    return path
  }

  async getContent(path: string): Promise<string> {
    const content = this.files.get(path)
    if (!content) {
      throw new FileNotFoundException(path)
    }
    if (content instanceof Uint8Array) {
      return new TextDecoder().decode(content)
    }
    return content
  }

  reset(): void {
    this.files.clear()
  }

  async cleanFilesystem(): Promise<void> {
    this.files.clear()
  }
}
