### Open-Source vs. Managed Cloud Replica

TekMemo is designed around a local-first architecture:
* **Open-Source Software (OSS):** The core memory engine (`@tekmemo/core`), command-line interface (`tekmemo`), and adapters run completely locally. Primitives, memories, and indexes are stored in `.tekmemo/` within your workspace directory.
* **TekMemo Cloud:** An optional, secure cloud replica. It acts as a sync transport, enabling you to replicate your local memory files across multiple machines. The Cloud is a repository sync backend, not a separate closed-source memory system.
