/**
 * CLI manifest validation, parsing, and initialization utilities wrapping the core MemoFS manifest logic.
 *
 * @module manifest
 */

import { randomUUID } from "node:crypto";
import {
	createDefaultMemoFsManifest,
	type MemoFsManifest,
	parseManifest as parseCoreManifest,
	validateMemoFsManifest,
} from "@memofs/core";
import { CliProtocolError } from "../errors/cli-errors";

/**
 * Type alias representing a MemoFS manifest.
 */
export type MemoFsCliManifest = MemoFsManifest;

/**
 * Creates a default manifest configuration with optional overrides.
 *
 * @param input - Override settings including projectId and initial timestamp.
 * @returns A fully initialized MemoFsCliManifest object.
 */
export function createDefaultManifest(input?: {
	projectId?: string;
	now?: string;
}): MemoFsCliManifest {
	return createDefaultMemoFsManifest({
		projectId: input?.projectId ?? `proj_${randomUUID()}`,
		...(input?.now !== undefined ? { now: () => input.now as string } : {}),
	});
}

/**
 * Parses raw JSON string content into a validated MemoFsCliManifest object.
 *
 * @param content - Raw JSON string content representing the manifest.
 * @returns The parsed and validated MemoFsCliManifest.
 * @throws {CliProtocolError} If JSON parsing or manifest validation fails.
 */
export function parseManifest(content: string): MemoFsCliManifest {
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
 * Asserts that the provided unknown object matches the expected schema of MemoFsCliManifest.
 *
 * @param value - Candidate manifest object.
 * @returns The validated MemoFsCliManifest.
 * @throws {CliProtocolError} If manifest validation fails.
 */
export function validateManifest(value: unknown): MemoFsCliManifest {
	try {
		return validateMemoFsManifest(value);
	} catch (error) {
		throw new CliProtocolError(
			`manifest.json is invalid: ${error instanceof Error ? error.message : String(error)}`,
			{ cause: error },
		);
	}
}
