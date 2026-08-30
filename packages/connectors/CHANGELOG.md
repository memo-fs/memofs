# @memofs/connectors

## Unreleased

*No changes yet.*

## 1.3.0-beta.3

### Patch Changes

- Updated internal dependencies.

## 1.3.0-beta.2

### Patch Changes

- Updated internal dependencies.

## 1.3.0-beta.1

### Patch Changes

- Updated internal dependencies.

## 1.2.0-beta.3

### Patch Changes

- Updated internal dependencies.

## 1.2.0-beta.2

### Patch Changes

- Updated internal dependencies.

## 1.2.0-beta.1

### Minor Changes

- GitHub Discussions connector now maps the discussion category as a label on the resulting note.

## 1.1.0-beta.1

### Minor Changes

- Unified timeout and retry handling across the built-in GitHub and Notion connectors for more consistent behavior.
- Simplified shared formatting logic between the GitHub and Notion connectors.

### Patch Changes

- Fixed a bug in connector duplicate-detection that could cause repeated notes to be created on re-runs.

## 1.0.0-beta.2

### Minor Changes

- A local ingestion framework for external sources like GitHub and Notion.
- Secure token handling with env, keychain, and file secret resolvers.
- Deduplication and stable source references for imported content.
