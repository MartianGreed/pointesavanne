export interface FileLocator {
  locate(path: string): Promise<string>
  save(location: string, content: string | Uint8Array): Promise<boolean>
}
