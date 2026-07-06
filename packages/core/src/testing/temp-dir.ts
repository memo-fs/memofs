import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function createTempMemoFsDir(): Promise<{
	rootDir: string;
	cleanup: () => Promise<void>;
}> {
	const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), "memofs-cli-"));

	return {
		rootDir,
		async cleanup() {
			await fs.rm(rootDir, { recursive: true, force: true });
		},
	};
}
