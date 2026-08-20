# Changelog

## Unreleased

### Added

- Initial manifest schema and structural validator.

### Schema governance

- Schemas are generated from the MemoFS TypeScript source types.
- AJV is the package's only runtime dependency. Zod remains in the core runtime, so consumers opt into JSON Schema validation only when they install this package.
- Quicktype was evaluated as an alternative generator. The TypeScript JSON Schema generator was selected because it derives directly from the source interfaces used by the runtime.
- When an on-disk shape changes, update its approved design record, regenerate the schema, bump this package, and add a changelog entry.
