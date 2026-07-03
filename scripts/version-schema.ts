import fs from "node:fs/promises";
import path from "node:path";

async function main() {
	const pkgPath = path.resolve(
		process.cwd(),
		"packages/tekmemo/package.json",
	);
	const pkgData = await fs.readFile(pkgPath, "utf-8");
	const pkg = JSON.parse(pkgData);
	const version = pkg.version;

	const schemaSrc = path.resolve(
		process.cwd(),
		"apps/docs/public/config.schema.json",
	);
	const targetDir = path.resolve(process.cwd(), "apps/docs/public", version);
	const targetPath = path.join(targetDir, "config.schema.json");

	const schemaData = await fs.readFile(schemaSrc, "utf-8");
	const schema = JSON.parse(schemaData);
	schema.$id = `https://docs.memo.tekbreed.com/${version}/config.schema.json`;

	await fs.mkdir(targetDir, { recursive: true });
	await fs.writeFile(
		targetPath,
		`${JSON.stringify(schema, null, 2)}\n`,
		"utf-8",
	);

	console.log(
		`Created versioned schema at apps/docs/public/${version}/config.schema.json`,
	);
}

main().catch(console.error);
