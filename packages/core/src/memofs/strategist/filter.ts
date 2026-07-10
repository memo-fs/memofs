import type { RecallItem } from "../types";
import type { FilterInput } from "./types";

export function filterCandidates(input: FilterInput): RecallItem[] {
	const retired = input.retiredGraphDocIds ?? new Set<string>();
	const minScore = input.minScore ?? 0;
	const seen = new Set<string>();
	const out: RecallItem[] = [];
	for (const item of input.items) {
		if (retired.has(item.id)) continue;
		if (seen.has(item.id)) continue;
		if ((item.score ?? 0) < minScore) continue;
		seen.add(item.id);
		out.push(item);
	}
	return out;
}
