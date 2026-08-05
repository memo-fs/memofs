# Writing a Custom Connector

```ts
import type { Connector, ConnectorRecord, ConnectorIngestContext } from "@memofs/connectors";

class LinearConnector implements Connector {
  readonly type = "linear";
  readonly displayName = "Linear";

  async ingest(ctx: ConnectorIngestContext): Promise<ConnectorRecord[]> {
    const records = await fetchLinearIssues(ctx.token, ctx.config.sourceMapping);
    // The runner handles dedup + the write discipline; the connector just
    // returns normalized records.
    return records.map((issue) => ({
      externalId: `linear:${issue.id}`,
      title: issue.title,
      content: issue.description,
      url: issue.url,
      occurredAt: issue.createdAt,
      metadata: { team: issue.team, status: issue.state },
    }));
  }
}
```

Register a custom connector via the registry:

```ts
import { createConnectorRegistry } from "@memofs/connectors";

const registry = createConnectorRegistry();
registry.register(new LinearConnector());

await runConnectors({ rootDir, memo, secretResolver, connectorRegistry: registry });
```

`ConnectorRegistry` also exposes `.get(type)`, `.has(type)`, and `.types()` if you need to inspect what's registered rather than just add to it.

## API Reference

### `runConnectors(options)`

Runs all enabled connectors in `.memofs/connectors.json`.

| Option | Type | Required | Description |
|---|---|---|---|
| `rootDir` | `string` | Yes | The `.memofs/` parent directory |
| `memo` | `MemoFS` | Yes | The host's MemoFS instance (single-writer) |
| `secretResolver` | `SecretResolver` | Yes | Resolves `secretRef` → token at runtime |
| `connectorRegistry` | `ConnectorRegistry` | No | Custom registry (defaults to built-ins) |
| `onlyType` | `string` | No | Run only connectors of this `type` — the same filter the CLI's `memofs connectors run --type <type>` uses |
| `signal` | `AbortSignal` | No | Abort signal for cancellation |

Returns a `RunConnectorsResult`: `{ written, skipped, errors, ran }`, where `ran` lists the connector `id`s that were attempted this pass (regardless of whether they wrote anything or errored) and the other three fields are aggregated across all of them.

### `EnvSecretResolver`

Reads tokens from `.memofs/secrets.json` (dev/local fallback). See the [naming note](#envsecretresolver-dev-local-fallback) above.

### `StaticSecretResolver`

In-memory map of `{ secretRef: token }` (tests/programmatic).

### `CloudSecretResolver`

Fetches tokens from the MemoFS cloud API (production).

### `createConnectorRegistry(extras?)`

Creates a registry seeded with the built-in connectors (GitHub + Notion), plus any extras.

### `connectorNoteId(record)`

Computes the deterministic `conn_<16 hex chars>` id for a `ConnectorRecord` without writing it — useful in tests that need to assert on an id, or in tooling that wants to check whether a given external item would be considered a duplicate.

### Error classes

All three are exported and carry a stable `.code` string, so you can branch on `.code` even across a boundary that loses the `instanceof` check (e.g. a worker or subprocess):

| Class | `.code` | Thrown when |
|---|---|---|
| `ConnectorConfigError` | `CONNECTOR_CONFIG_ERROR` | `connectors.json` is missing structure, has an invalid row, or trips a [validation guardrail](#config-validation-guardrails) |
| `ConnectorSecretError` | `CONNECTOR_SECRET_ERROR` | A `SecretResolver` can't resolve a `secretRef` (also exposes `.secretRef`) |
| `ConnectorError` | — | Base class both of the above extend; useful for a single `catch` |

### Reading and validating config directly

If you're building tooling around `connectors.json` rather than running ingestion, these are exported too:

| Export | Description |
|---|---|
| `readConnectorsFile(rootDir)` | Reads and validates `.memofs/connectors.json`; a missing file resolves to an empty set rather than throwing |
| `validateConnectorsFile(raw)` | Runs the same validation ([guardrails](#config-validation-guardrails) included) against an already-parsed value |
| `selectConnectors(file, { enabled?, type? })` | Filters a `ConnectorsFile` by enabled state and/or type — the same logic `runConnectors` and the CLI's `--type` use |
| `EMPTY_CONNECTORS_FILE` | A frozen `{ connectors: [] }` constant |

## See Also

- [Core Client API](/packages/core/client/)
- [Configuration](/packages/core/configuration)
- [CLI Connectors Commands](/packages/cli/connectors)