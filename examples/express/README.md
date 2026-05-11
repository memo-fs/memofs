# Express API example

    Call TekMemo Cloud from the server side of this framework.

    ## What this example demonstrates

    - creates a server-side TekMemo Cloud client
- composes context for a query
- keeps `TEKMEMO_API_KEY` out of browser code

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
    pnpm --filter @tekmemo/example-express dev
    ```

    ## Packages used

    ```bash
    pnpm add @tekmemo/cloud-client
    ```

    ## Safety notes

    - Never put `TEKMEMO_API_KEY` in browser-side code.
    - Use `@tekmemo/cloud-client` only from server routes, CLI tools, MCP runtimes, workers, or trusted backend code.
    - Local examples write only to temporary folders or `.tekmemo/` under the selected project root.
