# What is TekMemo?

TekMemo is a **layered memory runtime for AI agents and applications**. 

In a world where LLMs have large but ephemeral context windows, TekMemo provides the "long-term memory" and "project grounding" needed to keep agents accurate, consistent, and context-aware over weeks or months of work.

## Why TekMemo?

Current AI tools often suffer from "context drift" or "knowledge gaps" because they lack a dedicated place to store and retrieve project-specific knowledge. TekMemo solves this by providing:

1.  **Grounded Context:** Instead of relying on the model's training data, you ground it in the specific decisions, requirements, and architecture of your project.
2.  **Durable Memory:** Notes, decisions, and patterns are stored in a structured way that persists across sessions.
3.  **File-First Design:** Memory is stored as plain text and JSON files in your project's `.tekmemo` folder. It's human-readable, version-controllable, and easily inspectable.
4.  **Layered Approach:** Memory is organized into distinct layers:
    *   **Core:** The essential "project briefing" that is always relevant.
    *   **Notes:** Long-form archival records, decisions, and summaries.
    *   **Recall:** Indexed fragments for fast semantic retrieval.
    *   **Graph:** Structural relationships and architectural dependencies.

## How it Works

TekMemo works as a bridge between your project and your AI agent:

- **Collection:** Agents or developers record facts, decisions, and summaries into the `.tekmemo` directory.
- **Organization:** The runtime automatically manages snapshots, indexing, and conflict resolution.
- **Retrieval:** When an agent starts a task, TekMemo performs "Recall" (semantic search) and "Composition" to inject the most relevant memory directly into the agent's prompt.

## Getting Started

This guide gets you from zero to a working TekMemo memory setup.

### Recommended path

1. [Install TekMemo](./installation)
2. [Initialize local memory](./getting-started)
3. [Understand the filesystem](./filesystem-layout)
4. [Add durable records](./memory-records)
5. [Use the CLI or MCP in an agent workflow](/cli/)
6. [Connect cloud when you need sync or hosted APIs](/cloud-client/)

## Runtime choices

| Runtime | Use when |
| --- | --- |
| Local | You want inspectable project memory stored in `.tekmemo/`. |
| Cloud | You want hosted project memory, sync, API keys, recall, and graph endpoints. |
| Hybrid | You want local files plus cloud recall/sync. |
| In-memory | You are writing tests, demos, or package examples. |
