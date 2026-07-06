/**
 * CLI manifest validation, parsing, and initialization utilities wrapping the core TekMemo manifest logic.
 *
 * @module manifest
 */

import { randomUUID } from "node:crypto";
import {
	createDefaultTekMemoManifest,
	parseManifest as parseCoreManifest,
	type TekMemoManifest,
	validateTekMemoManifest,
} from "@memofs/core";
import { CliProtocolError } from "../errors/cli-errors";

/**
 * Type alias representing a TekMemo manifest.
 */
export type TekMemoCliManifest = TekMemoManifest;

/**
 * Creates a default manifest configuration with optional overrides.
 *
 * @param input - Override settings including projectId and initial timestamp.
 * @returns A fully initialized TekMemoCliManifest object.
 */
export function createDefaultManifest(input?: {
	projectId?: string;
	now?: string;
}): TekMemoCliManifest {
	return createDefaultTekMemoManifest({
		projectId: input?.projectId ?? `proj_${randomUUID()}`,
		...(input?.now !== undefined ? { now: () => input.now as string } : {}),
	});
}

/**
 * Parses raw JSON string content into a validated TekMemoCliManifest object.
 *
 * @param content - Raw JSON string content representing the manifest.
 * @returns The parsed and validated TekMemoCliManifest.
 * @throws {CliProtocolError} If JSON parsing or manifest validation fails.
 */
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

/**
 * Asserts that the provided unknown object matches the expected schema of TekMemoCliManifest.
 *
 * @param value - Candidate manifest object.
 * @returns The validated TekMemoCliManifest.
 * @throws {CliProtocolError} If manifest validation fails.
 */
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
