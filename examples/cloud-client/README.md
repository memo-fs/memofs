# Cloud client example

    Use `@tekmemo/cloud-client` from trusted backend code.

    ## What this example demonstrates

    - creates a project-scoped cloud client
- checks health
- composes context
- creates a note

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
    pnpm --filter @tekmemo/example-cloud-client dev
    ```

    ## Packages used

    ```bash
    pnpm add @tekmemo/cloud-client
    ```

    ## Safety notes

    - Never put `TEKMEMO_API_KEY` in browser-side code.
    - Use `@tekmemo/cloud-client` only from server routes, CLI tools, MCP runtimes, workers, or trusted backend code.
    - Local examples write only to temporary folders or `.tekmemo/` under the selected project root.
