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

## Common error classes

| Code | HTTP Status | Meaning |
| --- | --- | --- |
| `bad_request` | `400` | The request was malformed or missing required parameters. |
| `unauthorized` | `401` | Authentication failed. Check your `TEKMEMO_API_KEY`. |
| `forbidden` | `403` | You do not have permission to access this resource or project. |
| `not_found` | `404` | The requested memory, project, or node was not found. |
| `method_not_allowed` | `405` | The HTTP method used is not supported for this route. |
| `conflict` | `409` | A sync conflict occurred or the resource already exists. |
| `validation_error` | `422` | The input failed validation (e.g., content too long). |
| `rate_limited` | `429` | Too many requests. |
| `internal_error` | `500` | An unexpected internal error occurred on the server. |

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

By default, the cloud client strips upstream provider secrets and internal tokens from error messages before throwing them. 

**Rule:** Never blindly log raw HTTP response bodies if you aren't using the official client, as some providers may echo keys back on failure.
