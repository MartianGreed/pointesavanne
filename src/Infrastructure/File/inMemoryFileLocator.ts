import {
	File,
	type FileLocator,
	FileNotFoundException,
} from "../../Domain/Shared/file";

export class InMemoryFileLocator implements FileLocator {
	private files: Map<string, Uint8Array> = new Map();

	async save(file: File, content: Uint8Array): Promise<boolean> {
		this.files.set(file.location, content);
		return true;
	}

	async locate(path: string): Promise<File> {
		if (!this.files.has(path)) {
			throw new FileNotFoundException(path);
		}
		return new File(path);
	}

	async getContent(file: File): Promise<Uint8Array> {
		const content = this.files.get(file.location);
		if (!content) {
			throw new FileNotFoundException(file.location);
		}
		return content;
	}

	clear(): void {
		this.files.clear();
	}
}
