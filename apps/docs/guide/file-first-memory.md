# File-first memory

TekMemo’s local runtime is file-first. A project can carry its memory in a `.tekmemo/` directory that humans and tools can inspect.

## Why file-first?

- It works before cloud setup.
- It can be versioned intentionally.
- It is easy to inspect in code review.
- It gives agents durable context without requiring a hosted dashboard.
- It avoids hiding memory inside opaque model prompts.

## When not to use local-only memory

Use TekMemo Cloud when you need API keys, hosted sync, hosted recall, team access, graph APIs, connector data, or dashboard observability.
