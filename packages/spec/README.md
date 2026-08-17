# `@memofs/spec`

Portable MemoFS JSON Schemas and structural validation for AI-agent memory data.

## Install

```sh
npm install @memofs/spec
```

Requires Node.js 22 or later.

## Validate data

```ts
import { validate } from "@memofs/spec";

const result = validate(manifest, "manifest");

if (result !== true) {
	console.error(result);
}
```

`validate` returns `true` for valid data. Otherwise it returns AJV validation
errors that identify the invalid path and constraint.

## Import a schema

The first published schema is the version-one MemoFS manifest:

```ts
import manifestSchema from "@memofs/spec/schema/v1/manifest.json" with {
	type: "json",
};
```

Schemas are generated from MemoFS TypeScript source types. Use the versioned
schema subpath when generating bindings or validating data outside JavaScript.

## Development

Run `pnpm build:specs` from the repository root to regenerate schemas. Run
`pnpm --filter @memofs/spec test:run` to execute the validation contract.

## License

MIT
