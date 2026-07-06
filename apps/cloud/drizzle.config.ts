import { defineConfig } from "drizzle-kit";

export default defineConfig({
	schema: [
		"./src/.server/db/schema/auth.ts",
		"./src/.server/db/schema/team.ts",
		"./src/.server/db/schema/control-plane.ts",
	],
	out: "./drizzle",
	dialect: "sqlite",
});
