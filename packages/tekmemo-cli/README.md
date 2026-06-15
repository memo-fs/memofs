# @tekbreed/tekmemo-cli

Command-line interface for TekMemo — manage your agent memory from the terminal.

## Installation

```bash
npm install -D @tekbreed/tekmemo-cli
```

Or use directly without installing:

```bash
npx @tekbreed/tekmemo-cli --help
```

## Usage

```bash
# Initialise a memory workspace
npx tekmemo init

# Local runtime commands
npx tekmemo runtime read
npx tekmemo runtime remember "..."
npx tekmemo runtime snapshot

# Search memory
npx tekmemo search "query"

# Cloud commands
npx tekmemo cloud context
npx tekmemo cloud sync pull
npx tekmemo cloud sync push

# Full command list
npx tekmemo --help
```

## Documentation

Full documentation at [oss.tekbreed.com/tekmemo-cli](https://oss.tekbreed.com/tekmemo-cli).

## License

MIT
