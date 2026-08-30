import fs, { glob } from "node:fs/promises";
import path from "node:path";
import { getSlugs } from "fumadocs-core/source";
import { createRequestHandler } from "react-router";

function getPageImagePath(slugs) {
	const segments = slugs.filter((s) => s.length > 0);
	return segments.length === 0
		? "/og/docs/image.webp"
		: `/og/docs/${segments.join("/")}/image.webp`;
}

async function generateOgImages() {
	console.log("🎨 Generating Takumi Open Graph images...");
	const build = await import("../build/server/index.js");
	const handler = createRequestHandler(build);

	const clientDir = path.resolve(process.cwd(), "build/client");
	let count = 0;

	for await (const entry of glob("**/*.mdx", { cwd: "content/docs" })) {
		const slugs = getSlugs(entry);
		const imagePath = getPageImagePath(slugs);
		const url = `http://localhost${imagePath}`;

		const res = await handler(new Request(url));
		if (!res.ok) {
			console.warn(`⚠️ Failed to generate OG image for ${url} (${res.status})`);
			continue;
		}

		const buffer = Buffer.from(await res.arrayBuffer());
		const targetFile = path.join(
			clientDir,
			imagePath.startsWith("/") ? imagePath.slice(1) : imagePath,
		);

		await fs.mkdir(path.dirname(targetFile), { recursive: true });
		await fs.writeFile(targetFile, buffer);
		count++;
	}

	console.log(
		`✅ Successfully generated ${count} Takumi OG images in build/client/og/docs/`,
	);
}

generateOgImages().catch((err) => {
	console.error("❌ Error generating OG images:", err);
	process.exit(1);
});
