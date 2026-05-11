# MCP example

    Expose TekMemo memory to MCP-compatible tools such as Claude Code, Codex, Cursor, and OpenCode-style clients.

    ## What this example demonstrates

    - prints a cloud MCP client config
- creates a local MCP protocol server
- calls the health tool through JSON-RPC

    ## Install

    ```bash
    pnpm install
    ```

    ## Configure

    Copy the root examples env template when cloud access is needed:

    ```bash
    cp ../.env.example .env
    ```

    Then set the values relevant to this example.

    ## Run

    ```bash
    pnpm --filter @tekmemo/example-mcp dev
    ```

    ## Packages used

    ```bash
    pnpm add @tekmemo/mcp-server @tekmemo/cloud-client tekmemo @tekmemo/fs
    ```

    ## Safety notes

    - Never put `TEKMEMO_API_KEY` in browser-side code.
    - Use `@tekmemo/cloud-client` only from server routes, CLI tools, MCP runtimes, workers, or trusted backend code.
    - Local examples write only to temporary folders or `.tekmemo/` under the selected project root.
