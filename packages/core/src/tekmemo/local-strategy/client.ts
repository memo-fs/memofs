import type { MemoryStore } from "../../core/types/memory-store";
import type {
	AgentfsLikeClient,
	SnapshotMemoryInput,
	SnapshotMemoryResult,
} from "../../index";
import type { FileSyncLayer } from "../sync/file-replication";
import { loadNodeFs, loadNodePath, type NodePath } from "./helpers";

export function createLocalAgentfsClient(opts: {
	store: MemoryStore;
	projectId: string;
	syncLayer?: FileSyncLayer;
	createSnapshot?(input?: SnapshotMemoryInput): Promise<SnapshotMemoryResult>;
}): AgentfsLikeClient {
	const rootDir =
		opts.store instanceof Object &&
		"rootDir" in opts.store &&
		typeof opts.store.rootDir === "string"
			? opts.store.rootDir
			: process.cwd();
	const { syncLayer, createSnapshot } = opts;

	return {
		async readText(remotePath: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			return fs.readFile(resolveAgentPath(path, rootDir, remotePath), "utf8");
		},
		async writeText(remotePath: string, content: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			const target = resolveAgentPath(path, rootDir, remotePath);
			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.writeFile(target, content, "utf8");
		},
		async appendText(remotePath: string, content: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			const target = resolveAgentPath(path, rootDir, remotePath);
			await fs.mkdir(path.dirname(target), { recursive: true });
			await fs.appendFile(target, content, "utf8");
		},
		async exists(remotePath: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			try {
				await fs.stat(resolveAgentPath(path, rootDir, remotePath));
				return true;
			} catch {
				return false;
			}
		},
		async deleteText(remotePath: string) {
			const fs = await loadNodeFs();
			const path = await loadNodePath();
			const target = resolveAgentPath(path, rootDir, remotePath);
			await fs.rm(target, { force: true });
		},
		sync: {
			pull: syncLayer
				? async () => {
						await syncLayer.pull();
					}
				: async () => {},
			push: syncLayer
				? async () => {
						await syncLayer.pushFull();
					}
				: async () => {},
			checkpoint: createSnapshot
				? async (label: string) => {
						await createSnapshot({
							type: "pre-sync",
							label: label || `agentfs-checkpoint-${new Date().toISOString()}`,
						});
					}
				: async () => {},
		},
	};
}

function resolveAgentPath(
	path: NodePath,
	rootDir: string,
	remotePath: string,
): string {
	if (remotePath.includes("\0")) {
		throw new Error("Agent session path contains invalid characters.");
	}
	const relative = remotePath.replace(/^\/+/, "");
	const resolved = path.resolve(rootDir, relative);
	const normalizedRoot = rootDir.endsWith(path.sep)
		? rootDir
		: rootDir + path.sep;
	if (resolved !== rootDir && !resolved.startsWith(normalizedRoot)) {
		throw new Error("Agent session path escaped the workspace root.");
	}
	return resolved;
}
