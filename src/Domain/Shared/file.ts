export class File {
	constructor(readonly location: string) {}
}

export class FileNotFoundException extends Error {
	constructor(path: string) {
		super(`File not found: ${path}`);
		this.name = "FileNotFoundException";
	}
}

export interface FileLocator {
	save(file: File, content: Uint8Array): Promise<boolean>;
	locate(path: string): Promise<File>;
	getContent(file: File): Promise<Uint8Array>;
}
