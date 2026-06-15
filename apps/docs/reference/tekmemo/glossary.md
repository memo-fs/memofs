# Glossary

| Term | Meaning |
| --- | --- |
| **Agent session** | A temporary coding workspace managed by AgentFS, tracking the lifecycle of an agent's task. |
| **Cloud client** | The cloud client module of `@tekbreed/tekmemo`, handling API transport and auth. |
| **Context package** | A structured payload combining core memory, notes, recall results, and graph data to be sent to an AI model. |
| **Core memory** | The stable project briefing (`core.md`). Contains facts the agent must know every time it starts working. |
| **Graph memory** | Nodes (entities, concepts, files) and edges (relationships) that help tools answer architectural questions. |
| **Hybrid runtime** | A CLI mode that writes memory to local files but syncs changes to TekMemo Cloud in the background. |
| **MCP** | Model Context Protocol. An open standard used by the `tekmemo-mcp` server to expose memory to IDEs and agents. |
| **Note** | A durable memory record (e.g., a decision, constraint, or summary) saved to `notes.md`. |
| **Recall** | The process of retrieving relevant memory for a query. Can use keywords (local) or embeddings (cloud/provider). |
| **Snapshot** | A point-in-time backup bundle of project memory, used for rollbacks or migrations. |
| **Sync** | The mechanism of resolving memory state between the local `.tekmemo/` filesystem and the TekMemo Cloud database. |
