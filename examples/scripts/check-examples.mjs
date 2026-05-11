#!/usr/bin/env node
import { existsSync } from "node:fs";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const examplesDir = new URL("..", import.meta.url).pathname;
const required = [
	"local-only",
	"graph-memory",
	"cloud-client",
	"cli",
	"mcp",
	"ai-sdk",
	"nextjs",
	"react-router",
	"express",
	"hono",
	"cloudflare-workers",
	"node-http",
	"fastify",
	"nestjs",
	"astro",
	"sveltekit",
	"nuxt",
	"tanstack",
	"vite-react",
];

const allowedExternal = new Set([
	"node:fs/promises",
	"node:os",
	"node:path",
	"node:http",
	"@tekmemo/cloud-client",
	"@tekmemo/cli",
	"@tekmemo/mcp",
	"@tekmemo/ai-sdk",
	"@tekmemo/adapters",
	"@tekmemo/graph",
	"@tekmemo/fs",
	"tekmemo",
	"express",
	"fastify",
	"hono",
	"@nestjs/common",
]);

const problems = [];

for (const name of required) {
	const dir = join(examplesDir, name);
	if (!existsSync(dir)) problems.push(`Missing example directory: ${name}`);
	for (const file of [
		"README.md",
		"package.json",
		"tsconfig.json",
		"src/index.ts",
	]) {
		if (!existsSync(join(dir, file))) problems.push(`Missing ${name}/${file}`);
	}
}

const entries = await readdir(examplesDir);
for (const entry of entries) {
	if (entry.startsWith(".") || entry === "scripts") continue;
	const dir = join(examplesDir, entry);
	if (!(await stat(dir)).isDirectory()) continue;
	const packagePath = join(dir, "package.json");
	if (!existsSync(packagePath)) continue;
	const pkg = JSON.parse(await readFile(packagePath, "utf8"));
	if (pkg.private !== true)
		problems.push(`${entry}/package.json must be private`);
	if (!pkg.scripts?.typecheck)
		problems.push(`${entry}/package.json missing typecheck script`);
	const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
	const sourcePath = join(dir, "src/index.ts");
	const source = await readFile(sourcePath, "utf8");
	const imports = [...source.matchAll(/from\s+["']([^"']+)["']/g)].map(
		(match) => match[1],
	);
	for (const specifier of imports) {
		if (specifier.startsWith(".")) continue;
		const packageName = specifier.startsWith("@")
			? specifier.split("/").slice(0, 2).join("/")
			: specifier.split("/")[0];
		if (!allowedExternal.has(specifier) && !allowedExternal.has(packageName)) {
			problems.push(
				`${entry}/src/index.ts imports unapproved package: ${specifier}`,
			);
		}
		if (!specifier.startsWith("node:") && !(packageName in deps)) {
			problems.push(
				`${entry}/package.json missing dependency for import: ${packageName}`,
			);
		}
	}
	if (/TEKMEMO_API_KEY/.test(source) && entry === "vite-react") {
		problems.push(
			"vite-react must not reference TEKMEMO_API_KEY in browser-side source",
		);
	}
	if (/tk_live_(?!replace_me)/.test(source)) {
		problems.push(
			`${entry}/src/index.ts appears to contain a live-looking TekMemo key`,
		);
	}
}

if (problems.length > 0) {
	console.error("Example validation failed:");
	for (const problem of problems) console.error(`- ${problem}`);
	process.exit(1);
}

console.log(`Example validation passed for ${required.length} examples.`);
