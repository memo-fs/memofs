import type { MinimalMemoryStore } from "../types/contracts";

export class FakeMemoryStore implements MinimalMemoryStore {
	private readonly files = new Map<string, string>();

	async read(path: string): Promise<string> {
		if (!this.files.has(path)) {
			throw new Error(`Missing file: ${path}`);
		}

		const content = this.files.get(path);
		if (content === undefined) {
			throw new Error(`Missing file: ${path}`);
		}
		return content;
	}

	async write(path: string, content: string): Promise<void> {
		this.files.set(path, content);
	}

	async append(path: string, content: string): Promise<void> {
		this.files.set(path, `${this.files.get(path) ?? ""}${content}`);
	}

	async exists(path: string): Promise<boolean> {
		return Promise.resolve(this.files.has(path));
	}

	snapshot(): Record<string, string> {
		return Object.fromEntries(this.files.entries());
	}
}

export function createFakeMemoryStore(): FakeMemoryStore {
	return new FakeMemoryStore();
}
