# Package boundaries

Understanding how TekMemo packages relate to each other helps you choose the right imports.

## Cloud API transport

Only `@tekmemo/cloud-client` communicates with the TekMemo Cloud API. Other packages delegate to it when cloud access is needed:

- CLI cloud commands use `@tekmemo/cloud-client`.
- MCP cloud runtime uses `@tekmemo/cloud-client`.
- AI SDK cloud tools use `@tekmemo/cloud-client`.

## Provider adapters

Provider adapters (`@tekmemo/openai`, `@tekmemo/voyageai`, `@tekmemo/upstash-vector`) accept credentials from your code. They do not store or manage provider keys.

## Convenience imports

`@tekmemo/adapters` is a convenience package that reexports multiple adapter packages through subpath imports. Use it when you want a single dependency for several integrations, or use the direct packages for a smaller dependency footprint.
