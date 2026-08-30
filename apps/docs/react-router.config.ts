import { glob } from "node:fs/promises";
import type { Config } from "@react-router/dev/config";
import { createGetUrl, getSlugs } from "fumadocs-core/source";

const getUrl = createGetUrl("/docs");

export default {
	ssr: true,
	async prerender({ getStaticPaths }) {
		const paths = new Set<string>(getStaticPaths());

		paths.add("/sitemap.xml");
		paths.add("/llms.txt");
		paths.add("/llms-full.txt");
		paths.add("/docs");
		paths.add("/cookbooks");
		paths.add("/changelog");

		for await (const entry of glob("**/*.mdx", { cwd: "content/docs" })) {
			const slugs = getSlugs(entry);
			paths.add(getUrl(slugs));
		}

		return Array.from(paths);
	},
} satisfies Config;
