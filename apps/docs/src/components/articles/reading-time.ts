/**
 * Calculates estimated reading time from markdown content.
 */
export function calculateReadingTime(content: string): number {
	if (!content) return 1;

	// Remove YAML frontmatter if present
	const clean = content.replace(/^---[\s\S]*?---\r?\n/, "");

	// Extract code blocks (read slower than standard prose)
	const codeBlocks = clean.match(/```[\s\S]*?```/g) || [];
	const proseOnly = clean.replace(/```[\s\S]*?```/g, "");

	// Clean markdown formatting from prose for accurate word count
	const normalizedProse = proseOnly
		.replace(/!\[.*?\]\(.*?\)/g, "")
		.replace(/\[(.*?)\]\(.*?\)/g, "$1")
		.replace(/[`#*_~>|]/g, " ")
		.trim();

	// Count prose words (~200 words per minute)
	const proseWords = normalizedProse
		? normalizedProse.split(/\s+/).filter(Boolean).length
		: 0;
	const proseMinutes = proseWords / 200;

	// Estimate code block reading time (~40 lines of code per minute)
	const codeLines = codeBlocks.reduce((total, block) => {
		const lines = block.split(/\r?\n/).filter((line) => {
			const trimmed = line.trim();
			return trimmed.length > 0 && !trimmed.startsWith("```");
		});
		return total + lines.length;
	}, 0);
	const codeMinutes = codeLines / 40;

	return Math.max(1, Math.ceil(proseMinutes + codeMinutes));
}
