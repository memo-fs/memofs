import { VoyageValidationError } from "../errors/voyage-errors";

export type VoyageInputType = "query" | "document" | null;
export type VoyageOutputDtype =
	| "float"
	| "int8"
	| "uint8"
	| "binary"
	| "ubinary";
export type VoyageEncodingFormat = "base64" | null;

export const VOYAGE_DEFAULT_BASE_URL = "https://api.voyageai.com";
export const VOYAGE_EMBEDDINGS_PATH = "/v1/embeddings";
export const VOYAGE_MAX_BATCH_SIZE = 1000;

export const VOYAGE_FLEXIBLE_DIMENSIONS = [256, 512, 1024, 2048] as const;
export type VoyageFlexibleDimension =
	(typeof VOYAGE_FLEXIBLE_DIMENSIONS)[number];

export const VOYAGE_MODELS_WITH_FLEXIBLE_DIMENSIONS = new Set([
	"voyage-4-large",
	"voyage-4",
	"voyage-4-lite",
	"voyage-4-nano",
	"voyage-3-large",
	"voyage-3.5",
	"voyage-3.5-lite",
	"voyage-code-3",
	"voyage-multimodal-3.5",
]);

export const VOYAGE_KNOWN_FIXED_DIMENSION_MODELS = new Set([
	"voyage-finance-2",
	"voyage-law-2",
	"voyage-multilingual-2",
	"voyage-3",
	"voyage-3-lite",
	"voyage-code-2",
	"voyage-multimodal-3",
]);

export function isFlexibleDimension(
	value: number,
): value is VoyageFlexibleDimension {
	return (VOYAGE_FLEXIBLE_DIMENSIONS as readonly number[]).includes(value);
}

export function assertValidOutputDimension(input: {
	model: string;
	outputDimension?: number;
	allowUnknownModelDimensions?: boolean;
}): void {
	const { model, outputDimension, allowUnknownModelDimensions = true } = input;

	if (outputDimension === undefined) {
		return;
	}

	if (!Number.isInteger(outputDimension) || outputDimension <= 0) {
		throw new VoyageValidationError(
			"outputDimension must be a positive integer.",
		);
	}

	if (!isFlexibleDimension(outputDimension)) {
		throw new VoyageValidationError(
			`Unsupported Voyage outputDimension ${outputDimension}. Supported flexible dimensions are ${VOYAGE_FLEXIBLE_DIMENSIONS.join(", ")}.`,
		);
	}

	if (VOYAGE_MODELS_WITH_FLEXIBLE_DIMENSIONS.has(model)) {
		return;
	}

	if (VOYAGE_KNOWN_FIXED_DIMENSION_MODELS.has(model)) {
		throw new VoyageValidationError(
			`Model "${model}" is known as fixed-dimension in this package; do not pass outputDimension.`,
		);
	}

	if (!allowUnknownModelDimensions) {
		throw new VoyageValidationError(
			`Unknown Voyage model "${model}". Refusing outputDimension because allowUnknownModelDimensions is false.`,
		);
	}
}

export function expectedVectorLength(input: {
	outputDimension?: number;
	outputDtype?: VoyageOutputDtype;
	expectedDimensions?: number;
}): number | undefined {
	const explicit = input.expectedDimensions ?? input.outputDimension;
	if (explicit === undefined) return undefined;

	if (input.outputDtype === "binary" || input.outputDtype === "ubinary") {
		return explicit / 8;
	}

	return explicit;
}
