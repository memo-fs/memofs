# Architecture

TekMemo is designed around inspectable memory boundaries.

## Layers

1. Memory contracts
2. Local filesystem adapter
3. Recall and provider adapters
4. Graph memory
5. Cloud client transport
6. CLI, MCP, and AI SDK integrations

Each layer should remain narrow so packages can be tested and published independently.
