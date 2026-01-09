import {
	File,
	type FileLocator,
	FileNotFoundException,
} from "../../Domain/Shared/file";

export class LocalFileLocator implements FileLocator {
	constructor(private readonly basePath: string = "./storage") {}

	async save(file: File, content: Uint8Array): Promise<boolean> {
		try {
			const fullPath = `${this.basePath}/${file.location}`;
			await Bun.write(fullPath, content);
			return true;
		} catch {
			return false;
		}
	}

	async locate(path: string): Promise<File> {
		const fullPath = `${this.basePath}/${path}`;
		const bunFile = Bun.file(fullPath);
		const exists = await bunFile.exists();
		if (!exists) {
			throw new FileNotFoundException(path);
		}
		return new File(path);
	}

	async getContent(file: File): Promise<Uint8Array> {
		const fullPath = `${this.basePath}/${file.location}`;
		const bunFile = Bun.file(fullPath);
		const exists = await bunFile.exists();
		if (!exists) {
			throw new FileNotFoundException(file.location);
		}
		return new Uint8Array(await bunFile.arrayBuffer());
	}
}
