# MCP prompts

The TekMemo MCP server exposes two built-in prompts that guide the LLM toward grounded memory operations.

## Prompt table

| Name | Title | Purpose |
| --- | --- | --- |
| `tekmemo-recall-context` | Recall TekMemo Context | Turn a user question into a grounded recall instruction |
| `tekmemo-memory-review` | Review Memory Candidate | Review whether text should become durable TekMemo memory |

## `tekmemo-recall-context`

Guides the model to use TekMemo recall to answer a user question, returning grounded context before the answer.

**Arguments:**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `query` | string | Yes | The user question or task |
| `workspaceId` | string | No | Optional workspace ID |
| `includeGraph` | boolean | No | Whether to use graph-aware recall (default: `true`) |

**Generated prompt:**

```
Use TekMemo recall to answer this request.
Query: <query>
Workspace: <workspaceId or "runtime default">
Graph-aware recall: <yes/no>

Return grounded context first, then the answer.
```

## `tekmemo-memory-review`

Guides the model to review and classify candidate memory before writing it to TekMemo.

**Arguments:**

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `content` | string | Yes | Potential memory content (max 100,000 chars) |
| `workspaceId` | string | No | Optional workspace ID |

**Generated prompt:**

```
Review this candidate memory before writing it to TekMemo.
Workspace: <workspaceId or "runtime default">

Candidate:
<content>

Classify it as durable, short-lived, sensitive, redundant, or unsafe.
Explain whether it should be saved.
```

## Example usage

```bash
# In an MCP client, invoke a prompt:
# tekmemo-recall-context with query="What's the sync strategy?"
# tekmemo-memory-review with content="Use D1 for sync truth."
```

Prompts are exposed via the `prompts/list` and `prompts/get` MCP protocol methods. Any MCP host can list them and invoke them with arguments.
