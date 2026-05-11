# AI SDK agent patterns

## Before answering

Ask TekMemo for context related to the task.

## After durable decisions

Store only durable, non-secret facts.

## In cloud mode

Use `@tekmemo/cloud-client` to construct the runtime.

## In local mode

Use local `.tekmemo/` runtime for repository-bound agents.
