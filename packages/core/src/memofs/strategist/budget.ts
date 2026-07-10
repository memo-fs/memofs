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
			const truncatedContent = compressSectionContent(
				section.type,
				section.content,
				bodyBudget,
			);
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

function compressSectionContent(
	type: string | undefined,
	content: string,
	bodyBudget: number,
): string {
	const delimiter = type === "recall" ? "\n\n" : "\n";
	const items = content
		.split(delimiter)
		.filter((item) => item.trim().length > 0);

	let currentText = "";
	const included: string[] = [];
	const omitted: string[] = [...items];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (item === undefined) continue;
		const nextIncluded = [...included, item];
		const nextOmitted = items.slice(i + 1);

		const nextIncludedText = nextIncluded.join(delimiter);
		if (nextOmitted.length === 0) {
			if (Buffer.byteLength(nextIncludedText, "utf8") <= bodyBudget) {
				currentText = nextIncludedText;
				included.push(item);
				omitted.shift();
			}
			break;
		}

		const nextOutlineLines = nextOmitted.map((item) => {
			const firstLine = item.split("\n")[0] || "";
			let summary = firstLine.replace(/^\d+\.\s*/, "").replace(/^-\s*/, "");
			if (summary.length > 80) {
				summary = `${summary.slice(0, 77)}...`;
			}
			return `[Omitted: "${summary}"]`;
		});

		const maxOutlineItems = 5;
		const nextOutlineToShow = nextOutlineLines.slice(0, maxOutlineItems);
		const nextHiddenCount = nextOutlineLines.length - maxOutlineItems;
		const nextSuffix =
			nextHiddenCount > 0 ? `\n ↳ [and ${nextHiddenCount} more items...]` : "";

		const nextOutlineText = `\n\n[Omitted ${nextOmitted.length} items to fit context budget:\n${nextOutlineToShow.map((o) => ` ↳ ${o}`).join("\n")}${nextSuffix}\nTo view these, run recall with specific search terms]`;

		const totalBytes = Buffer.byteLength(
			nextIncludedText + nextOutlineText,
			"utf8",
		);
		if (totalBytes <= bodyBudget) {
			currentText = nextIncludedText;
			included.push(item);
			omitted.shift();
		} else {
			break;
		}
	}

	if (omitted.length === 0) {
		return content;
	}

	// Build the final outline for the items that remain omitted
	const outlineLines = omitted.map((item) => {
		const firstLine = item.split("\n")[0] || "";
		let summary = firstLine.replace(/^\d+\.\s*/, "").replace(/^-\s*/, "");
		if (summary.length > 80) {
			summary = `${summary.slice(0, 77)}...`;
		}
		return `[Omitted: "${summary}"]`;
	});

	const maxOutlineItems = 5;
	const outlineToShow = outlineLines.slice(0, maxOutlineItems);
	const hiddenCount = outlineLines.length - maxOutlineItems;
	const suffix =
		hiddenCount > 0 ? `\n ↳ [and ${hiddenCount} more items...]` : "";

	const outlineText = `\n\n[Omitted ${omitted.length} items to fit context budget:\n${outlineToShow.map((o) => ` ↳ ${o}`).join("\n")}${suffix}\nTo view these, run recall with specific search terms]`;

	const totalBytes = Buffer.byteLength(currentText + outlineText, "utf8");
	if (totalBytes <= bodyBudget) {
		return currentText + outlineText;
	}

	const fallbackOutline = `\n\n[Omitted ${omitted.length} items due to context budget limits]`;
	const fallbackBytes = Buffer.byteLength(
		currentText + fallbackOutline,
		"utf8",
	);
	if (fallbackBytes <= bodyBudget) {
		return currentText + fallbackOutline;
	}

	const NOTICE = `\n\n[Section truncated to ${bodyBudget} bytes]`;
	const noticeBytes = Buffer.byteLength(NOTICE, "utf8");
	const sliceable = Math.max(0, bodyBudget - noticeBytes);
	const sliced = sliceUtf8(content, sliceable).trimEnd();
	return `${sliced}${NOTICE}`;
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
