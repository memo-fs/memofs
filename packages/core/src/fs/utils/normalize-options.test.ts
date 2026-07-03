import { expect, test } from "vitest";
import { normalizeOptions } from "./normalize-options";

test("normalizeOptions applies defaults", () => {
	const result = normalizeOptions({ rootDir: "/tmp" });
	expect(result.createRoot).toBe(true);
	expect(result.missingFileBehavior).toBe("throw");
	expect(result.disallowSymlinks).toBe(true);
	expect(result.directoryMode).toBe(0o700);
	expect(result.fileMode).toBe(0o600);
});

test("normalizeOptions preserves overrides", () => {
	const result = normalizeOptions({
		rootDir: "/tmp",
		createRoot: false,
		missingFileBehavior: "empty",
	});
	expect(result.createRoot).toBe(false);
	expect(result.missingFileBehavior).toBe("empty");
});
