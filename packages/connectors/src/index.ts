/**
 * `@tekmemo/connectors` — the local connector framework for TekMemo.
 *
 * Connectors ingest external sources (GitHub, Notion, …) into `.tekmemo/`
 * through the local engine. Each source is a plugin implementing the
 * provider-neutral {@link Connector} interface. See `README.md` and
 * [](https://github.com/tekbreed/tekmemo/blob/main/docs/adr/0002-connectors-run-locally.md).
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
	FileSecretResolverOptions,
	SecretResolver,
} from "./secret-resolver";
export { EnvSecretResolver, StaticSecretResolver } from "./secret-resolver";
export type {
	Connector,
	ConnectorConfig,
	ConnectorIngestContext,
	ConnectorIngestError,
	ConnectorIngestResult,
	ConnectorRecord,
	ConnectorsFile,
} from "./types";
