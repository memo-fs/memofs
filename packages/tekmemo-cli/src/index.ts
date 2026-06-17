/**
 * Main entry point exporting the public API for the TekMemo CLI library.
 *
 * @module index
 */

export type { CliTekmemoOptions } from "./cli/tekmemo";
export { createTekmemoFromCli } from "./cli/tekmemo";
export type { TekMemoConfigFile } from "./config";
export { writeDefaultCliConfig } from "./config";
export type { CliErrorCode } from "./errors/cli-errors";
export {
	CliError,
	CliFsError,
	CliJsonlError,
	CliProtocolError,
	CliUsageError,
	CliValidationError,
} from "./errors/cli-errors";
export type {
	BufferedOutputOptions,
	CliOutput,
	JsonEnvelope,
} from "./output/output";
export {
	createBufferedOutput,
	printHumanOrJson,
	printJsonEnvelope,
	printJsonError,
} from "./output/output";
export {
	REQUIRED_DIRS,
	REQUIRED_FILES,
	TEKMEMO_DIR,
	TEKMEMO_PATHS,
} from "./protocol/constants";
export type { JsonlParseOptions, JsonlRecord } from "./protocol/jsonl";
export { parseJsonl, stringifyJsonl } from "./protocol/jsonl";
export type { TekMemoCliManifest } from "./protocol/manifest";
export {
	createDefaultManifest,
	parseManifest,
	validateManifest,
} from "./protocol/manifest";
export type { TekMemoInspection } from "./protocol/summary";
export { inspectTekMemo } from "./protocol/summary";
export type { RunTekMemoCliInput, RunTekMemoCliResult } from "./runner";
export { runTekMemoCli } from "./runner";
export { createSafeIdFromLabel, validateSnapshotLabel } from "./utils/labels";
export { redactSecretPreview, scanForSecrets } from "./utils/secrets";
