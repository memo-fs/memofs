import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const url = process.env.DATABASE_URL;
if (!url) {
	throw new Error(
		"DATABASE_URL is required for drizzle-kit. Copy .env.example to .env.",
	);
}

export default defineConfig({
	schema: ["./src/db/schema.ts"],
	out: "./drizzle",
	dialect: "turso",
	dbCredentials: {
		url,
		authToken: process.env.DATABASE_AUTH_TOKEN,
	},
});
