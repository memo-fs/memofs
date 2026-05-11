# Package boundaries

## Golden rule

Only `@tekmemo/cloud-client` owns Cloud API transport.

## Examples

- CLI cloud commands call `@tekmemo/cloud-client`.
- MCP cloud runtime calls `@tekmemo/cloud-client`.
- AI SDK cloud tools call runtime helpers or `@tekmemo/cloud-client`.
- Provider adapters accept credentials from their caller.
- Low-level packages do not own dashboards, billing, tenancy, or hosted storage.

## Adapter aggregation

`@tekmemo/adapters` is an application-facing aggregation package. It may depend on first-party adapter packages and expose convenience subpath reexports.

`tekmemo` core, recall contracts, rerank contracts, filesystem primitives, and graph primitives must not depend on `@tekmemo/adapters`. This keeps the core package solo and prevents provider SDKs, AI SDK tools, vector stores, or cloud transport from becoming transitive core dependencies.
