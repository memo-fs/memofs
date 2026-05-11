# CLI example

    Use TekMemo from shell scripts or programmatically through the CLI runner.

    ## What this example demonstrates

    - runs `tekmemo init` programmatically
- stores a durable note
- prints JSON output from `tekmemo context`

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
    pnpm --filter @tekmemo/example-cli dev
    ```

    ## Packages used

    ```bash
    pnpm add -D @tekmemo/cli
    ```

    ## Safety notes

    - Never put `TEKMEMO_API_KEY` in browser-side code.
    - Use `@tekmemo/cloud-client` only from server routes, CLI tools, MCP runtimes, workers, or trusted backend code.
    - Local examples write only to temporary folders or `.tekmemo/` under the selected project root.
