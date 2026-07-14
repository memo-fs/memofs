# Sync Sub-API (Hybrid Mode Only)

## `memo.sync.status`

Checks sync status, returning counts of local-only changes or remote-only changes.

```ts
const status = await memo.sync.status();
console.log(`Unpushed changes: ${status.localChangesCount}`);
```

## `memo.sync.push`

Pushes local modifications to the remote cloud replica (two-phase: upload + complete).

```ts
const pushResult = await memo.sync.push({});
await memo.sync.complete({ uploadId: pushResult.uploadId });
```

## `memo.sync.pull`

Pulls remote memory changes and applies them to the local store.

```ts
await memo.sync.pull({});
```