# Vite React safe browser boundary example

    Show the safe browser boundary for a Vite React app.

    ## What this example demonstrates

    - calls your own backend endpoint
- explains why direct browser use is unsafe
- keeps cloud-client in server code

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
    pnpm --filter @tekmemo/example-vite-react dev
    ```

    ## Packages used

    ```bash
    pnpm add @tekmemo/cloud-client
    ```

    ## Safety notes

    - Never put `TEKMEMO_API_KEY` in browser-side code.
    - Use `@tekmemo/cloud-client` only from server routes, CLI tools, MCP runtimes, workers, or trusted backend code.
    - Local examples write only to temporary folders or `.tekmemo/` under the selected project root.
