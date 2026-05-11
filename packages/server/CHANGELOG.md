# @tekmemo/server

## 0.1.0

Initial release.

- Hono-based self-hostable TekMemo memory server
- Node.js subpath export with PostgreSQL job queue, S3 object storage, and local storage backends
- In-memory store implementation for testing
- Project-scoped REST API: health, projects, memory CRUD, recall, agent sessions
- Job queue for async operations (extraction, benchmarks, recall indexing)