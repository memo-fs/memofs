import { createFromSource } from "fumadocs-core/search/server";
import { source } from "../lib/source";

/**
 * Build-time search index for static hosting. Prerendered to
 * `/search-index.json` once per deploy; the docs search dialog downloads it
 * (`staticClient`) instead of querying a server that does not exist on
 * Cloudflare Pages. Covers the documentation collection (articles ship
 * their own search box on the index page).
 */
const server = createFromSource(source);

export async function loader() {
	return server.staticGET();
}
