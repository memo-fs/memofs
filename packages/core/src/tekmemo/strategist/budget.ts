import type { BudgetInput, BudgetSection } from "./types";

export function allocateBudget(input: BudgetInput): {
	sections: BudgetSection[];
	text: string;
	truncated: boolean;
} {
	const packed: BudgetSection[] = [];
	let truncated = false;
	let used = 0;
	const SEPARATOR = "\n\n";
	const separatorBytes = Buffer.byteLength(SEPARATOR, "utf8");

	const accountSection = (section: BudgetSection, isFirst: boolean): number => {
		const heading = `## ${section.title}\n\n`;
		const body = section.content;
		const sep = isFirst ? 0 : separatorBytes;
		return (
			Buffer.byteLength(heading, "utf8") + Buffer.byteLength(body, "utf8") + sep
		);
	};

	let isFirst = true;
	for (const section of input.sections) {
		if (!section.nonNegotiable) continue;
		used += accountSection(section, isFirst);
		packed.push(section);
		isFirst = false;
	}

	const negotiable = input.sections
		.filter((s) => !s.nonNegotiable)
		.filter((s) => s.content.trim().length > 0);
	const totalWeight = negotiable.reduce((sum, s) => sum + (s.weight ?? 1), 0);
	let remaining = Math.max(0, input.maxBytes - used);

	for (const section of negotiable) {
		if (remaining <= 0) break;
		const share =
			totalWeight > 0
				? Math.floor((remaining * (section.weight ?? 1)) / totalWeight)
				: 0;
		const heading = `## ${section.title}\n\n`;
		const sep = packed.length === 0 ? 0 : separatorBytes;
		const headingBytes = Buffer.byteLength(heading, "utf8") + sep;
		const bodyBudget = Math.max(0, share - headingBytes);
		const bodyBytes = Buffer.byteLength(section.content, "utf8");
		if (bodyBytes <= bodyBudget) {
			const cost = headingBytes + bodyBytes;
			used += cost;
			remaining -= cost;
			packed.push(section);
		} else {
			const NOTICE = `\n\n[Section truncated to ${bodyBudget} bytes]`;
			const noticeBytes = Buffer.byteLength(NOTICE, "utf8");
			const sliceable = Math.max(0, bodyBudget - noticeBytes);
			const sliced = sliceUtf8(section.content, sliceable).trimEnd();
			const truncatedContent = `${sliced}${NOTICE}`;
			const cost = headingBytes + Buffer.byteLength(truncatedContent, "utf8");
			used += cost;
			remaining -= cost;
			packed.push({ ...section, content: truncatedContent });
			truncated = true;
		}
	}

	const text = packed
		.map((section) => `## ${section.title}\n\n${section.content}`)
		.join("\n\n");

	return { sections: packed, text, truncated };
}

function sliceUtf8(text: string, maxBytes: number): string {
	if (Buffer.byteLength(text, "utf8") <= maxBytes) return text;
	let low = 0;
	let high = text.length;
	while (low < high) {
		const mid = Math.floor((low + high + 1) / 2);
		if (Buffer.byteLength(text.slice(0, mid), "utf8") <= maxBytes) low = mid;
		else high = mid - 1;
	}
	return text.slice(0, low);
}

export const SECTION_WEIGHTS = {
	entities: 2,
	recall: 3,
	recent: 1,
	notes: 1,
} as const;
