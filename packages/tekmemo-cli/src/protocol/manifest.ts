import { randomUUID } from "node:crypto";
import {
	createDefaultTekMemoManifest,
	parseManifest as parseCoreManifest,
	type TekMemoManifest,
	validateTekMemoManifest,
} from "@tekbreed/tekmemo";
import { CliProtocolError } from "../errors/cli-errors";

export type TekMemoCliManifest = TekMemoManifest;

export function createDefaultManifest(input?: {
	projectId?: string;
	now?: string;
}): TekMemoCliManifest {
	return createDefaultTekMemoManifest({
		projectId: input?.projectId ?? `proj_${randomUUID()}`,
		...(input?.now !== undefined ? { now: () => input.now as string } : {}),
	});
}

export function parseManifest(content: string): TekMemoCliManifest {
	try {
		return parseCoreManifest(content);
	} catch (error) {
		throw new CliProtocolError(
			`manifest.json is invalid: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
	}
}

export function validateManifest(value: unknown): TekMemoCliManifest {
	try {
		return validateTekMemoManifest(value);
	} catch (error) {
		throw new CliProtocolError(
			`manifest.json is invalid: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
	}
}
