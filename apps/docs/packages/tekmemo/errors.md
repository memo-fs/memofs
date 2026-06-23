# Errors

TekMemo Cloud APIs return structured errors designed to be predictable and easy to log.

## Error shape

A standard error response follows the `{ error, meta }` envelope format:

```json
{
  "error": {
    "code": "bad_request",
    "message": "The request payload was invalid.",
    "details": {
      "reason": "Missing required field: 'projectId'"
    }
  },
  "meta": {
    "requestId": "req_123abc"
  }
}
```

The SDK transport automatically unwraps these envelopes — it returns the `data` payload directly on success, and throws a typed `TekMemoCloudError` on failure. You do not need to parse envelopes yourself.

## Typed error classes

The cloud client maps HTTP status codes to specific error classes, all extending `TekMemoCloudError`:

| Class | HTTP Status | Meaning |
| --- | --- | --- |
| `TekMemoCloudValidationError` | `400`, `422` | The request was malformed or failed validation. |
| `TekMemoCloudAuthError` | `401` | Authentication failed. Check your `TEKMEMO_API_KEY`. |
| `TekMemoCloudPermissionError` | `403` | You do not have permission to access this resource or project. |
| `TekMemoCloudNotFoundError` | `404` | The requested memory, project, or node was not found. |
| `TekMemoCloudConflictError` | `409` | A sync conflict occurred or the resource already exists. |
| `TekMemoCloudRateLimitError` | `429` | Too many requests. Check `retryAfterMs`. |
| `TekMemoCloudServerError` | `500+` | An unexpected server error occurred. |

Non-HTTP errors:

| Class | Meaning |
| --- | --- |
| `TekMemoCloudNetworkError` | The request could not reach the server. |
| `TekMemoCloudTimeoutError` | The request timed out. |
| `TekMemoCloudResponseParseError` | The server response could not be parsed. |
| `TekMemoCloudConfigurationError` | The client was misconfigured (e.g. missing baseUrl). |

## `TekMemoCloudError` properties

| Property | Type | Description |
| --- | --- | --- |
| `code` | `string` | Machine-readable error code. |
| `message` | `string` | Human-readable description. |
| `status?` | `number` | HTTP status code. |
| `requestId?` | `string` | Cloud request ID for debugging. |
| `retryAfterMs?` | `number` | Suggested retry delay (rate limits). |
| `details?` | `JsonValue` | Structured error context. |

## Using `isTekMemoCloudError`

```ts
import { isTekMemoCloudError } from "@tekbreed/tekmemo";

try {
  await client.memory.readCore();
} catch (error) {
  if (isTekMemoCloudError(error)) {
    console.error(`[${error.status}] ${error.code}: ${error.message}`);
    if (error.requestId) console.error("Request:", error.requestId);
  }
}
```

## Success and List Envelopes

Success responses also use a standard envelope with a `meta` object containing the `requestId` for debugging.

### Single Resource
```json
{
  "data": { "id": "note_123", "content": "..." },
  "meta": { "requestId": "req_456" }
}
```

### Resource List (Pagination)
For list endpoints, the `meta` object includes pagination details.
```json
{
  "data": [...],
  "meta": {
    "requestId": "req_789",
    "pagination": {
      "nextCursor": "cursor_xyz"
    }
  }
}
```

## Security and redaction

By default, the cloud client strips upstream provider secrets and internal tokens from error messages before throwing them. Patterns redacted: `tk_live_...`, `tm_live_...`, `Bearer ...`, `sk-...`, `pa-...`.

**Rule:** Never blindly log raw HTTP response bodies if you aren't using the official client, as some providers may echo keys back on failure.
