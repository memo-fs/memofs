# Graph memory

While traditional memory (`core.md` or `notes.md`) stores raw text, **Graph memory** structures knowledge as a web of relationships. This allows coding agents to answer complex architectural questions like *"What depends on this API endpoint?"* or *"Why was this UI library chosen over the alternative?"*

## Nodes

A node is a specific entity in your project's ecosystem. Nodes can represent:
- **Files/Modules** (e.g., `src/auth.ts`)
- **Concepts/Systems** (e.g., `The Billing Engine`)
- **Decisions** (e.g., `Decision: Use Tailwind`)
- **External Dependencies** (e.g., `NextAuth.js`)
- **Tasks/Tickets** (e.g., `JIRA-1234`)

Every node has a unique identifier, a label, and optional metadata.

## Edges

An edge connects two nodes, defining their relationship. Edges can be directed and typed. 

Common edge types include:
- `depends_on` (A requires B to function)
- `implements` (A fulfills the interface of B)
- `resolves` (A fixes bug B)
- `supersedes` (A replaces decision B)
- `relates_to` (A and B are contextually linked)

Edges can also carry weight, confidence scores, and source references back to the code or documentation where the relationship was discovered.

## Using graph memory

You can interact with graph memory through multiple surfaces:

1. **Local Graph**: `@tekmemo/graph` provides the TypeScript contracts and local graph behavior, saving nodes and edges as JSON lines in `.tekmemo/`.
2. **Cloud APIs**: TekMemo Cloud exposes project-scoped graph APIs for managing massive graphs. `@tekmemo/cloud-client` wraps these endpoints.
3. **Agent Tools**: `@tekmemo/mcp-server` exposes graph tools to coding agents so they can traverse relationships at runtime.
