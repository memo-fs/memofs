### Open-Source vs. Managed Cloud Replica

MemoFS is designed around a file-first architecture:
* **Open-Source Software (OSS):** The core memory engine (`@memofs/core`), command-line interface (`memofs`), and adapters run completely locally. Primitives, memories, and indexes are stored in `.memofs/` within your workspace directory.
* **MemoFS Cloud:** An optional, secure cloud replica. It acts as a sync transport, enabling you to replicate your local memory files across multiple machines. The Cloud is a repository sync backend, not a separate closed-source memory system.
