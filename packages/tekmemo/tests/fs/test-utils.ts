import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export async function createTempRoot(prefix = "tekmemo-fs-"): Promise<string> {
	return await fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function readFile(
	rootDir: string,
	relativePath: string,
): Promise<string> {
	return await fs.readFile(path.join(rootDir, relativePath), "utf8");
}

export async function pathExists(filePath: string): Promise<boolean> {
	try {
		await fs.access(filePath);
		return true;
	} catch {
		return false;
	}
}
