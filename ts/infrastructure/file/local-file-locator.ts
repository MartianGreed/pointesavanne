import { FileNotFoundException } from '../../domain/shared/exception/file-not-found.ts'

export class LocalFileLocator {
  private static readonly TMP_PATH = '/tmp'

  constructor(private readonly rootDir: string) {}

  async save(location: string, content: string | Uint8Array): Promise<boolean> {
    const fullPath = this.getTmpPath() + location
    await Bun.write(Bun.file(fullPath), content)
    return true
  }

  async locate(path: string): Promise<string> {
    const fullPath = this.getTmpPath() + path
    const file = Bun.file(fullPath)
    if (!(await file.exists())) {
      throw new FileNotFoundException(path)
    }
    return fullPath
  }

  async getContent(path: string): Promise<string> {
    const fullPath = this.getTmpPath() + path
    const file = Bun.file(fullPath)
    return file.text()
  }

  async cleanFilesystem(path: string = ''): Promise<void> {
    const { rmdir, readdir, unlink, stat } = await import('node:fs/promises')
    const { join } = await import('node:path')

    const fullPath = this.getTmpPath() + path
    try {
      const content = await readdir(fullPath)
      for (const fs of content) {
        const nestedPath = join(fullPath, fs)
        const stats = await stat(nestedPath)
        if (stats.isDirectory()) {
          await this.cleanFilesystem(path + fs + '/')
        }

        if (stats.isFile()) {
          await unlink(nestedPath)
        } else {
          await rmdir(nestedPath)
        }
      }
    } catch {
      throw new Error("Couldn't parse local filesystem")
    }
  }

  private getTmpPath(): string {
    return this.rootDir + LocalFileLocator.TMP_PATH + '/'
  }
}
