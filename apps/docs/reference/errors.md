# Errors

Cloud errors should expose a code, status, message, and request ID.

Common classes:

- authentication error
- authorization/scope error
- validation error
- rate limit error
- not found error
- provider error
- network error

Error messages must redact secrets.
