import { describe, expect, it } from "vitest";
import {
	buildCoreMemoryText,
	CORE_MEMORY_PATH,
	InMemoryMemoryStore,
	normalizeMarkdownDocument,
	readCoreMemory,
	writeCoreMemory,
} from "../../src/index";

describe("core memory", () => {
	it("normalizes line endings and ensures trailing newline", async () => {
		const store = new InMemoryMemoryStore();
		await writeCoreMemory(store, "# Core\r\nBody");

		expect(await store.read(CORE_MEMORY_PATH)).toBe("# Core\nBody\n");
	});

	it("reads and builds trimmed core memory text", async () => {
		const store = new InMemoryMemoryStore({
			[CORE_MEMORY_PATH]: "  # Core\n  ",
		});

		expect(await readCoreMemory(store)).toBe("  # Core\n  ");
		expect(await buildCoreMemoryText(store)).toBe("# Core");
	});

	it("normalizes markdown directly", () => {
		expect(normalizeMarkdownDocument("a\r\nb")).toBe("a\nb\n");
	});
});
