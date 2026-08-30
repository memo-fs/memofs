/**
 * Config module barrel.
 *
 * @module config
 */

export type { MemoFsConfigFile } from "./runtime";
export {
	resolveConnectorsSchemaPath,
	resolveSchemaPath,
	writeDefaultCliConfig,
} from "./runtime";
