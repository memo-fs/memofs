# `@tekmemo/connectors` API

The `@tekmemo/connectors` package manages ingestion pipelines from external databases and repositories.

## Functions

### `runConnectors`
Orchestrates loading configuration files, resolving secret tokens, and executing enabled ingestion scripts.

```ts
function runConnectors(options: RunConnectorsOptions): Promise<RunConnectorsResult>;
```

---

## Interfaces

### `SecretResolver`
Resolves opaque credential strings to live API tokens.
- `resolveSecret(ref: string): Promise<string>`

### `Connector`
Custom ingestion plug-in contract.
- `ingest(ctx: ConnectorIngestContext): Promise<ConnectorRecord[]>`
