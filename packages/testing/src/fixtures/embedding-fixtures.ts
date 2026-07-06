export const EMBEDDING_TEXTS_FIXTURE = [
	"MemoFS starts with local .memofs files.",
	"Recall uses vectors and optional reranking.",
	"Cloud sync adds teams, restore, and production controls.",
] as const;

export function createVector(dimensions: number, seed = 1): number[] {
	return Array.from(
		{ length: dimensions },
		(_value, index) => (seed + index + 1) / dimensions,
	);
}

export function createOrthogonalishVector(
	dimensions: number,
	activeIndex: number,
): number[] {
	return Array.from({ length: dimensions }, (_value, index) =>
		index === activeIndex ? 1 : 0,
	);
}
