import type { AgentfsLikeClient, AgentfsLikeSync } from "../src/index";

export class NotFoundError extends Error {
	code = "ENOENT";
	status = 404;
	constructor(path: string) {
		super(`Not found: ${path}`);
		this.name = "NotFoundError";
	}
}

export class InMemoryAgentfsClient implements AgentfsLikeClient {
	readonly files = new Map<string, string>();
	readonly calls: string[] = [];
	failRead = false;
	failWrite = false;
	failAppend = false;
	failExists = false;
	readDelayMs = 0;
	writeDelayMs = 0;
	appendText?: (path: string, content: string) => Promise<void>;
	exists?: (path: string) => Promise<boolean>;
	sync?: AgentfsLikeSync;

	constructor(
		options: {
			nativeAppend?: boolean;
			exists?: boolean;
			sync?: AgentfsLikeSync;
		} = {},
	) {
		if (options.nativeAppend ?? true) {
			this.appendText = async (
				path: string,
				content: string,
			): Promise<void> => {
				this.calls.push(`append:${path}:${content}`);
				if (this.failAppend) {
					throw new Error("append failed");
				}
				this.files.set(path, (this.files.get(path) ?? "") + content);
			};
		}

		if (options.exists ?? true) {
			this.exists = async (path: string): Promise<boolean> => {
				this.calls.push(`exists:${path}`);
				if (this.failExists) {
					throw new Error("exists failed");
				}
				return this.files.has(path);
			};
		}

		if (options.sync) {
			this.sync = options.sync;
		}
	}

	async readText(path: string): Promise<string> {
		this.calls.push(`read:${path}`);
		if (this.failRead) {
			throw new Error("read failed");
		}
		if (this.readDelayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, this.readDelayMs));
		}
		const value = this.files.get(path);
		if (value === undefined) {
			throw new NotFoundError(path);
		}
		return value;
	}

	async writeText(path: string, content: string): Promise<void> {
		this.calls.push(`write:${path}:${content}`);
		if (this.failWrite) {
			throw new Error("write failed");
		}
		if (this.writeDelayMs > 0) {
			await new Promise((resolve) => setTimeout(resolve, this.writeDelayMs));
		}
		this.files.set(path, content);
	}
}
