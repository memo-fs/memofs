# Utilities

## `memo.validate`

Validates the memory filesystem integrity.

```ts
const result = await memo.validate({ strict: true });
console.log(result.ok, result.errors);
```

## `memo.consolidate`

Runs a local consolidation pass — merges duplicate graph entities and retires superseded facts.

```ts
const result = await memo.consolidate({ apply: true });
console.log(result.mergesApplied, result.retirementsApplied);
```

## `memo.health`

Returns the runtime health and capability list.

```ts
const health = await memo.health();
console.log(health.ok, health.capabilities);
```
