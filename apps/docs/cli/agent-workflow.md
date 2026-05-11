# CLI agent workflow

Add this to coding-agent instructions:

```md
This project uses TekMemo for durable project memory.

Before planning, run:
tekmemo context --query "<current task>"

When a durable decision is made, run:
tekmemo remember "<decision>" --kind decision --actor agent:<tool-name>

Do not store secrets, credentials, private keys, API tokens, or customer data in TekMemo.
```

Use `--json` when another tool will parse the output.
