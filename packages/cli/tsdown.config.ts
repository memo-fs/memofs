import { readFileSync } from "node:fs";
import { isAbsolute, resolve } from "node:path";
import { pkgConfig } from "@repo/tsdown";

/**
 * Rolldown plugin that inlines `*.md?raw` imports as string constants at
 * build time. Mirrors Vite's native `?raw` support (which vitest uses in
 * tests). The `.md` template files remain the single source of truth —
 * this plugin just bundles their content into the JS output.
 */
function rawMdPlugin() {
	return {
		name: "raw-md-loader",
		resolveId(source: string, importer: string | undefined) {
			if (!source.endsWith("?raw")) return null;
			const filePath = source.slice(0, -4);
			const abs = isAbsolute(filePath)
				? filePath
				: resolve(importer ? resolve(importer, "..", filePath) : filePath);
			return `${abs}?raw`;
		},
		load(id: string) {
			if (!id.endsWith("?raw")) return null;
			const filePath = id.slice(0, -4);
			const content = readFileSync(filePath, "utf8");
			return `export default ${JSON.stringify(content)}`;
		},
	};
}

export default pkgConfig({
	entry: {
		index: "src/index.ts",
		"bin/memofs": "src/bin/memofs.ts",
	},
	plugins: [rawMdPlugin()],
});
