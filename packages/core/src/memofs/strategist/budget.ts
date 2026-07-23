import { sliceUtf8ByBytes, utf8ByteLength } from "../helpers/utils";
import type { BudgetInput, BudgetSection } from "./types";

/**
 * Default token estimate via TextEncoder byte length /4 approx.
 * Matches OpenAI heuristic: ~4 bytes per token for English.
 *
 * @param text - Text to estimate.
 * @returns Token count estimate, at least 1.
 */
export function defaultTokenEstimator(text: string): number {
	return Math.max(1, Math.ceil(utf8ByteLength(text) / 4));
}

export function allocateBudget(input: BudgetInput): {
	sections: BudgetSection[];
	text: string;
	truncated: boolean;
} {
	const packed: BudgetSection[] = [];
	let truncated = false;
	let used = 0;
	const SEPARATOR = "\n\n";
	const separatorBytes = utf8ByteLength(SEPARATOR);
	const estimateTokens = input.tokenEstimator ?? defaultTokenEstimator;

	const accountSection = (section: BudgetSection, isFirst: boolean): number => {
		const heading = `## ${section.title}\n\n`;
		const body = section.content;
		const sep = isFirst ? 0 : separatorBytes;
		return utf8ByteLength(heading) + utf8ByteLength(body) + sep;
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
		const headingBytes = utf8ByteLength(heading) + sep;
		const bodyBudget = Math.max(0, share - headingBytes);
		const bodyBytes = utf8ByteLength(section.content);
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
				estimateTokens,
			);
			const cost = headingBytes + utf8ByteLength(truncatedContent);
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
	tokenEstimator: (text: string) => number = defaultTokenEstimator,
): string {
	const delimiter = type === "recall" ? "\n\n" : "\n";
	const items = content
		.split(delimiter)
		.filter((item) => item.trim().length > 0);

	const tokenBudget = Math.max(1, Math.ceil(bodyBudget / 4));

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
			if (
				utf8ByteLength(nextIncludedText) <= bodyBudget &&
				tokenEstimator(nextIncludedText) <= tokenBudget
			) {
				currentText = nextIncludedText;
				included.push(item);
				omitted.shift();
			}
			break;
		}

		const nextOutlineLines = nextOmitted.map((lineItem) => {
			const firstLine = lineItem.split("\n")[0] || "";
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

		const candidateText = nextIncludedText + nextOutlineText;
		const totalBytes = utf8ByteLength(candidateText);
		const totalTokens = tokenEstimator(candidateText);
		if (totalBytes <= bodyBudget && totalTokens <= tokenBudget) {
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
	const outlineLines = omitted.map((lineItem) => {
		const firstLine = lineItem.split("\n")[0] || "";
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

	const withOutline = currentText + outlineText;
	if (
		utf8ByteLength(withOutline) <= bodyBudget &&
		tokenEstimator(withOutline) <= tokenBudget
	) {
		return withOutline;
	}

	const fallbackOutline = `\n\n[Omitted ${omitted.length} items due to context budget limits]`;
	const withFallback = currentText + fallbackOutline;
	if (
		utf8ByteLength(withFallback) <= bodyBudget &&
		tokenEstimator(withFallback) <= tokenBudget
	) {
		return withFallback;
	}

	// Ultimate fallback: hard byte cap with token-aware slice reporting.
	// Byte cap is still hard per ticket; token count is reported for observability.
	const NOTICE = `\n\n[Section truncated to ${bodyBudget} bytes ~${tokenBudget} tokens]`;
	const noticeBytes = utf8ByteLength(NOTICE);
	if (noticeBytes > bodyBudget) {
		// Even the notice doesn't fit — return raw slice respecting byte cap.
		return sliceUtf8ByBytes(content, bodyBudget).trimEnd();
	}
	const sliceable = Math.max(0, bodyBudget - noticeBytes);
	const sliced = sliceUtf8ByBytes(content, sliceable).trimEnd();
	return `${sliced}${NOTICE}`;
}

export const SECTION_WEIGHTS = {
	entities: 2,
	recall: 3,
	recent: 1,
	notes: 1,
} as const;
