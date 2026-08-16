---
title: "@memofs/connectors API"
description: "API reference for @memofs/connectors: ingestion pipelines, connector registry, deterministic note ID generation, and third-party sources."
---

# `@memofs/connectors` API

The `@memofs/connectors` package manages ingestion pipelines from external sources (GitHub, Notion, and custom connectors) into MemoFS memory.

## Functions

### `runConnectors`

Orchestrates loading `.memofs/connectors.json`, resolving credentials through `SecretResolver`, executing enabled ingestion connectors, deduplicating records against existing event logs, and committing notes to MemoFS memory.

```ts
function runConnectors(options: RunConnectorsOptions): Promise<RunConnectorsResult>;
```

### `createConnectorRegistry`

Creates a new `ConnectorRegistry` seeded with the built-in connectors (`GitHubConnector` and `NotionConnector`), plus any optional extra connectors.

```ts
function createConnectorRegistry(extras?: readonly Connector[]): ConnectorRegistry;
```

### `connectorNoteId`

Computes the deterministic `conn_<16 hex chars>` note ID for a `ConnectorRecord` using `sha256(externalId + ":" + content).slice(0, 16)`. Pure computation with zero wall-clock dependency.

```ts
function connectorNoteId(record: ConnectorRecord): Promise<string>;
```

### `readConnectorsFile`

Reads and validates `.memofs/connectors.json` for a given project root. A missing file degrades gracefully to `EMPTY_CONNECTORS_FILE` (`{ connectors: [] }`) rather than throwing. Malformed files or files violating secret guardrails throw `ConnectorConfigError`.

```ts
function readConnectorsFile(rootDir: string): Promise<ConnectorsFile>;
```

### `validateConnectorsFile`

Runs structural and secret-leak validation against a parsed `connectors.json` JSON payload. Rejects forbidden token keys, recursive substring matches, and credential pattern matches.

```ts
function validateConnectorsFile(raw: unknown): ConnectorsFile;
```

### `selectConnectors`

Filters a `ConnectorsFile` by `enabled` state and/or connector `type`.

```ts
function selectConnectors(
  file: ConnectorsFile,
  opts?: { enabled?: boolean; type?: string }
): ConnectorConfig[];
```

## Classes

### `ConnectorRegistry`

Mutable registry mapping a connector `type` identifier to a `Connector` implementation instance.

```ts
class ConnectorRegistry {
  constructor(builtins?: readonly Connector[]);
  register(connector: Connector): this;
  get(type: string): Connector | undefined;
  has(type: string): boolean;
  types(): readonly string[];
}
```

### `GitHubConnector`

Built-in connector for GitHub issues, pull requests, and discussions (`type: "github"`). Implements `Connector`.

```ts
class GitHubConnector implements Connector {
  readonly type = "github";
  readonly displayName = "GitHub";
  ingest(ctx: ConnectorIngestContext): Promise<readonly ConnectorRecord[]>;
}
```

### `NotionConnector`

Built-in connector for Notion database rows and workspace search pages (`type: "notion"`). Implements `Connector`.

```ts
class NotionConnector implements Connector {
  readonly type = "notion";
  readonly displayName = "Notion";
  ingest(ctx: ConnectorIngestContext): Promise<readonly ConnectorRecord[]>;
}
```

### `EnvSecretResolver`

Dev/local fallback resolver. Reads `{ "secretRef": "token" }` maps from `.memofs/secrets.json` on disk (cached in memory). Implements `SecretResolver`.

```ts
class EnvSecretResolver implements SecretResolver {
  constructor(options: FileSecretResolverOptions);
  resolve(secretRef: string): Promise<string>;
}
```

### `StaticSecretResolver`

In-memory secret resolver for tests and programmatic embedding. Implements `SecretResolver`.

```ts
class StaticSecretResolver implements SecretResolver {
  constructor(entries: Record<string, string>);
  resolve(secretRef: string): Promise<string>;
}
```

### `CloudSecretResolver`

Production secret resolver that calls the MemoFS Cloud API endpoint `GET {cloudBaseUrl}/projects/:projectId/connectors/secret?ref=:secretRef`. Implements `SecretResolver`.

```ts
class CloudSecretResolver implements SecretResolver {
  constructor(options: CloudSecretResolverOptions);
  resolve(secretRef: string): Promise<string>;
}
```

## Interfaces & Types

### `SecretResolver`

Credential plane contract. Implementations resolve an opaque `secretRef` to a live plaintext token in memory.

```ts
interface SecretResolver {
  resolve(secretRef: string): Promise<string>;
}
```

### `Connector`

Provider-neutral plugin interface for data sources.

```ts
interface Connector {
  readonly type: string;
  readonly displayName: string;
  ingest(ctx: ConnectorIngestContext): Promise<readonly ConnectorRecord[]>;
}
```

### `ConnectorConfig`

Single connector instance row stored in `.memofs/connectors.json`.

```ts
interface ConnectorConfig {
  readonly id: string;
  readonly type: string;
  readonly enabled: boolean;
  readonly schedule?: string;
  readonly sourceMapping?: JsonObject;
  readonly secretRef: string;
}
```

### `ConnectorsFile`

The parsed on-disk shape of `.memofs/connectors.json` (the 11th canonical sync unit).

```ts
interface ConnectorsFile {
  readonly connectors: readonly ConnectorConfig[];
}
```

### `ConnectorRecord`

A normalized external item produced by `Connector.ingest()`.

```ts
interface ConnectorRecord {
  readonly externalId: string;
  readonly title: string;
  readonly content: string;
  readonly url?: string;
  readonly occurredAt?: string;
  readonly metadata?: JsonObject;
}
```

### `ConnectorIngestContext`

Runtime context passed into `Connector.ingest()`.

```ts
interface ConnectorIngestContext {
  readonly config: ConnectorConfig;
  readonly token: string;
  readonly memo: MemoFS;
  readonly signal?: AbortSignal;
}
```

### `RunConnectorsOptions`

Configuration options passed to `runConnectors()`.

```ts
interface RunConnectorsOptions {
  readonly rootDir: string;
  readonly memo: MemoFS;
  readonly secretResolver: SecretResolver;
  readonly connectorRegistry?: ConnectorRegistry;
  readonly onlyType?: string;
  readonly signal?: AbortSignal;
}
```

### `RunConnectorsResult`

Aggregated result returned by `runConnectors()`.

```ts
interface RunConnectorsResult {
  readonly written: readonly string[];
  readonly skipped: readonly string[];
  readonly errors: readonly ConnectorIngestError[];
  readonly ran: readonly string[];
}
```

### `ConnectorIngestResult`

Result of a single connector pass before aggregation.

```ts
interface ConnectorIngestResult {
  readonly written: readonly string[];
  readonly skipped: readonly string[];
  readonly errors: readonly ConnectorIngestError[];
}
```

### `ConnectorIngestError`

A recoverable error encountered during a connector pass.

```ts
interface ConnectorIngestError {
  readonly connectorType: string;
  readonly message: string;
  readonly externalId?: string;
  readonly cause?: unknown;
}
```

### `FileSecretResolverOptions`

Constructor options for file-backed secret resolvers (`EnvSecretResolver`).

```ts
interface FileSecretResolverOptions {
  readonly rootDir: string;
}
```

### `CloudSecretResolverOptions`

Constructor options for `CloudSecretResolver`.

```ts
interface CloudSecretResolverOptions {
  readonly projectId: string;
  readonly apiKey: string;
  readonly cloudBaseUrl: string;
}
```

## Error Classes

All connector errors inherit from `ConnectorError` and provide a stable `.code` string:

```ts
class ConnectorError extends Error {
  readonly code: string;
  constructor(code: string, message: string, options?: { cause?: unknown });
}
```

| Class | Base | `.code` | Properties | Thrown When |
|---|---|---|---|---|
| `ConnectorConfigError` | `ConnectorError` | `"CONNECTOR_CONFIG_ERROR"` | — | `.memofs/connectors.json` is missing required structure, contains malformed rows, or violates token guardrails. |
| `ConnectorSecretError` | `ConnectorError` | `"CONNECTOR_SECRET_ERROR"` | `readonly secretRef: string` | A `SecretResolver` fails to resolve a `secretRef`. |

## Constants

### `EMPTY_CONNECTORS_FILE`

A frozen `{ connectors: [] }` default returned when `.memofs/connectors.json` is absent.

```ts
const EMPTY_CONNECTORS_FILE: ConnectorsFile;
```