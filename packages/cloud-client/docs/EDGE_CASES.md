# Edge Cases Covered

## Configuration

- Empty `baseUrl` fails before request.
- Invalid `baseUrl` fails before request.
- Non-HTTPS `baseUrl` fails unless hostname is `localhost` or `127.0.0.1`.
- Missing API key fails for protected routes.
- `health()` does not require an API key.
- `defaultProjectId` may be used when method input omits `projectId`.
- Missing project ID fails before request.

## Routing

- Project IDs are URL-encoded.
- Conflict IDs are URL-encoded.
- Query parameters omit `undefined`, `null`, and empty string values.
- Cloud routes are project-scoped.

## Envelopes

- Canonical success envelope `{ data, meta }` is parsed.
- Canonical error envelope `{ error, meta }` is parsed.
- Legacy `{ ok, data }` can be accepted temporarily.
- Legacy envelopes can be disabled for strict testing.
- Invalid JSON responses throw `TekMemoCloudResponseParseError`.
- Invalid envelopes throw `TekMemoCloudResponseParseError`.

## Retry/timeout

- Transient HTTP statuses are retried.
- Network errors are retried when retry is enabled.
- Timeouts throw `TekMemoCloudTimeoutError`.
- `Retry-After` is respected when present.

## Security

- Authorization header cannot be overridden by custom headers.
- API keys are redacted from thrown messages.
- OpenAI/Voyage-style provider key patterns are also redacted.
- Provider BYOK keys are not stored here.

## Validation

- Empty recall query fails before request.
- Empty note content fails before request.
- Empty core memory content fails before request.
- Invalid sync event arrays fail before request.
- Invalid conflict resolution values fail before request.
- Non-JSON-serializable metadata fails before request.

## Hybrid runtime

- `local-first` reads fallback to cloud.
- `cloud-first` reads fallback to local.
- `local-only` never calls cloud.
- `cloud-only` never calls local.
- `local-first` writes local first and best-effort mirrors to cloud.
- `cloud-first` writes cloud first and best-effort mirrors to local.
- Secondary write failures are surfaced through warning hooks instead of losing the primary result.
