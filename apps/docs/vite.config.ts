import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { fumadocsMdx } from "fumadocs-mdx/vite";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [fumadocsMdx(), tailwindcss(), reactRouter()],
	resolve: {
		tsconfigPaths: true,
	},
});
