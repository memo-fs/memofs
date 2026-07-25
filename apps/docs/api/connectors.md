# `@memofs/connectors` API

The `@memofs/connectors` package manages ingestion pipelines from external sources (GitHub, Notion, and custom connectors) into MemoFS memory.

## Functions

### `runConnectors`
Orchestrates loading configuration, resolving secret tokens, and executing enabled ingestion connectors.

```ts
function runConnectors(options: RunConnectorsOptions): Promise<RunConnectorsResult>;
```

### `createConnectorRegistry`
Creates a `ConnectorRegistry` seeded with the built-in connectors (GitHub + Notion), plus any extras.

```ts
function createConnectorRegistry(extras?: readonly Connector[]): ConnectorRegistry;
```

### `connectorNoteId`
Computes the deterministic `conn_<16 hex chars>` note id for a `ConnectorRecord` (content-derived, no wall-clock).

```ts
function connectorNoteId(record: ConnectorRecord): Promise<string>;
```

### `readConnectorsFile`
Reads and validates `.memofs/connectors.json`. A missing file resolves to an empty connector set rather than throwing.

```ts
function readConnectorsFile(rootDir: string): Promise<ConnectorsFile>;
```

### `validateConnectorsFile`
Runs the same structural and secret-leak validation as `readConnectorsFile` against an already-parsed value.

```ts
function validateConnectorsFile(raw: unknown): ConnectorsFile;
```

### `selectConnectors`
Filters a `ConnectorsFile` by `enabled` state and/or `type`.

```ts
function selectConnectors(
  file: ConnectorsFile,
  opts?: { enabled?: boolean; type?: string }
): ConnectorConfig[];
```

---

## Classes

### `ConnectorRegistry`
Mutable registry mapping a connector `type` to a `Connector` implementation. Constructed with the built-ins (GitHub, Notion) by default.

- `register(connector: Connector): this`
- `get(type: string): Connector | undefined`
- `has(type: string): boolean`
- `types(): readonly string[]`

### `GitHubConnector` / `NotionConnector`
The built-in `Connector` implementations, registered by default. `type: "github"` and `type: "notion"` respectively.

### `EnvSecretResolver`
Dev/local fallback resolver. Reads a `{ secretRef: token }` map from `.memofs/secrets.json`. Despite the name, it reads a local file, not `process.env`.

```ts
new EnvSecretResolver(options: FileSecretResolverOptions);
// FileSecretResolverOptions: { rootDir: string }
```

### `StaticSecretResolver`
In-memory map, for tests and programmatic embedding.

```ts
new StaticSecretResolver(entries: Record<string, string>);
```

### `CloudSecretResolver`
Resolves secrets against the MemoFS cloud API.

```ts
new CloudSecretResolver(options: CloudSecretResolverOptions);
// CloudSecretResolverOptions: { projectId: string; apiKey: string; cloudBaseUrl: string }
```

---

## Interfaces

### `SecretResolver`
Resolves an opaque `secretRef` to a live API token.
- `resolve(secretRef: string): Promise<string>`

### `Connector`
Custom ingestion plug-in contract. One implementation per external source.
- `readonly type: string`
- `readonly displayName: string`
- `ingest(ctx: ConnectorIngestContext): Promise<readonly ConnectorRecord[]>`

### `ConnectorConfig`
One row of `.memofs/connectors.json`.
- `readonly id: string`
- `readonly type: string`
- `readonly enabled: boolean`
- `readonly schedule?: string`
- `readonly sourceMapping?: JsonObject`
- `readonly secretRef: string`

### `ConnectorRecord`
A normalized external item, returned by `Connector.ingest` before the runner writes it.
- `readonly externalId: string`
- `readonly title: string`
- `readonly content: string`
- `readonly url?: string`
- `readonly occurredAt?: string`
- `readonly metadata?: JsonObject`

### `ConnectorIngestContext`
Passed to `Connector.ingest` on each run.
- `readonly config: ConnectorConfig`
- `readonly token: string`
- `readonly memo: MemoFS`
- `readonly signal?: AbortSignal`

### `RunConnectorsOptions`
Options for `runConnectors`.
- `readonly rootDir: string`
- `readonly memo: MemoFS`
- `readonly secretResolver: SecretResolver`
- `readonly connectorRegistry?: ConnectorRegistry`
- `readonly onlyType?: string`
- `readonly signal?: AbortSignal`

### `RunConnectorsResult`
Return value of `runConnectors`, aggregated across every connector that ran.
- `readonly written: readonly string[]`
- `readonly skipped: readonly string[]`
- `readonly errors: readonly ConnectorIngestError[]`
- `readonly ran: readonly string[]`

### `ConnectorIngestResult`
A single connector's result, before aggregation (no `ran` field — that's aggregate-only).
- `readonly written: readonly string[]`
- `readonly skipped: readonly string[]`
- `readonly errors: readonly ConnectorIngestError[]`

### `ConnectorIngestError`
One recoverable error recorded in `RunConnectorsResult.errors`.
- `readonly connectorType: string`
- `readonly message: string`
- `readonly externalId?: string`
- `readonly cause?: unknown`

### `ConnectorsFile`
The parsed shape of `.memofs/connectors.json`.
- `readonly connectors: readonly ConnectorConfig[]`

---

## Errors

All extend `ConnectorError` and carry a stable `.code` string, so callers can branch without string-matching messages.

| Class | `.code` |
|---|---|
| `ConnectorConfigError` | `CONNECTOR_CONFIG_ERROR` |
| `ConnectorSecretError` (also exposes `.secretRef`) | `CONNECTOR_SECRET_ERROR` |

---

## Constants

### `EMPTY_CONNECTORS_FILE`
A frozen `{ connectors: [] }` — the default when no config file exists yet.