export interface FileLocator {
  locate(path: string): Promise<string>
}
