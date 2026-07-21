# Snapshots Sub-API

## `memo.snapshots.create`

Takes a versioned checkpoint of the current memory filesystem.

```ts
const snapshot = await memo.snapshots.create({ label: "before-refactor" });
console.log(`Snapshot created: ${snapshot.id}`);
```

## `memo.snapshots.restore`

Restores the memory filesystem to a previously created checkpoint.

```ts
await memo.snapshots.restore("snap_12345");
```

## `memo.snapshots.list`

Lists all stored snapshots.

```ts
const snapshots = await memo.snapshots.list();
```