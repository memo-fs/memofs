/**
 * `@memofs/connectors` — the local connector framework for MemoFS.
 *
 * Connectors ingest external sources (GitHub, Notion, …) into `.memofs/`
 * through the local engine. Each source is a plugin implementing the
 * provider-neutral {@link Connector} interface.
 *
 * @public
 */

export {
	EMPTY_CONNECTORS_FILE,
	readConnectorsFile,
	selectConnectors,
	validateConnectorsFile,
} from "./config";
// Built-in connectors — GitHub + Notion.
export { GitHubConnector } from "./connectors/github";
export { NotionConnector } from "./connectors/notion";
export {
	ConnectorConfigError,
	ConnectorError,
	ConnectorSecretError,
} from "./errors";
export { connectorNoteId } from "./id";
export { ConnectorRegistry, createConnectorRegistry } from "./registry";
export type { RunConnectorsOptions, RunConnectorsResult } from "./runner";
export { runConnectors } from "./runner";
export type {
	CloudSecretResolverOptions,
	FileSecretResolverOptions,
	SecretResolver,
} from "./secret-resolver";
export {
	CloudSecretResolver,
	EnvSecretResolver,
	StaticSecretResolver,
} from "./secret-resolver";
export type {
	Connector,
	ConnectorConfig,
	ConnectorIngestContext,
	ConnectorIngestError,
	ConnectorIngestResult,
	ConnectorRecord,
	ConnectorsFile,
} from "./types";
