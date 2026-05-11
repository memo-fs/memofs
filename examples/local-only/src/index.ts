import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNodeFsMemoryStore } from "@tekmemo/fs";
import {
	bootstrapMemoryStore,
	CORE_MEMORY_PATH,
	NOTES_MEMORY_PATH,
	readCoreMemory,
	writeCoreMemory,
} from "tekmemo";

const rootDir = await mkdtemp(join(tmpdir(), "tekmemo-local-"));

try {
	const store = createNodeFsMemoryStore({
		rootDir,
		missingFileBehavior: "empty",
		createRoot: true,
	});
	await bootstrapMemoryStore(store, { projectId: "local-example" });

	await writeCoreMemory(
		store,
		[
			"# Core Memory",
			"",
			"This project uses TekMemo as file-first memory for agents.",
		].join("\n"),
	);

	await store.append(
		NOTES_MEMORY_PATH,
		`## Local decision

- kind: decision
- tags: examples, local

Use \`.tekmemo/\` for local-first agent memory.
`,
	);

	const core = await readCoreMemory(store);
	const notes = await store.read(NOTES_MEMORY_PATH);

	console.log({
		rootDir,
		corePath: CORE_MEMORY_PATH,
		coreHasTekMemo: core.includes("TekMemo"),
		notesHasDecision: notes.includes("Local decision"),
	});
} finally {
	await rm(rootDir, { recursive: true, force: true });
}
