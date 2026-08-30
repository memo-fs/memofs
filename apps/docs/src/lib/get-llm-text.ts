import type { source } from "./source";

export async function getLLMText(page: (typeof source)["$inferPage"]) {
	let processed = "";
	try {
		processed = await page.data.getText("processed");
	} catch {
		try {
			processed = await page.data.getText("raw");
		} catch {
			processed = "";
		}
	}

	return `# ${page.data.title} (${page.url})\n\n${page.data.description ? `> ${page.data.description}\n\n` : ""}${processed}`;
}
