import type { FileLocator } from '../../../ts/domain/shared/file-locator.ts'
import { FileNotFoundException } from '../../../ts/domain/shared/exception/file-not-found.ts'

export class InMemoryFileLocator implements FileLocator {
  private files: Map<string, string> = new Map()

  async locate(path: string): Promise<string> {
    const fullPath = this.files.get(path)
    if (!fullPath) {
      throw new FileNotFoundException(path)
    }
    return fullPath
  }

  addFile(name: string, path: string): void {
    this.files.set(name, path)
  }

  hasFile(name: string): boolean {
    return this.files.has(name)
  }

  clear(): void {
    this.files.clear()
  }
}
