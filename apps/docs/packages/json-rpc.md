# JSON-RPC Primitives (`@memofs/json-rpc`)

`@memofs/json-rpc` is a shared protocol package containing the message parsers, serializers, and validation schemas for JSON-RPC 2.0.

This package is utilized internally by both the Model Context Protocol (MCP) server and the self-hostable memory server to ensure consistent and type-safe command dispatching.

---

## Installation

```bash
npm install @memofs/json-rpc
```

---

## Core Utilities

### 1. Message Validation
Includes Zod schemas for validating incoming request objects:

```ts
import { jsonRpcRequestSchema } from "@memofs/json-rpc";

const request = {
  jsonrpc: "2.0",
  id: 42,
  method: "recall",
  params: { query: "test" }
};

const parsed = jsonRpcRequestSchema.safeParse(request);
if (parsed.success) {
  console.log("Valid JSON-RPC request");
}
```

### 2. Standard Errors
Provides constants and classes representing JSON-RPC 2.0 standard error codes:

- Parse Error (`-32700`)
- Invalid Request (`-32600`)
- Method Not Found (`-32601`)
- Invalid Params (`-32602`)
- Internal Error (`-32603`)
