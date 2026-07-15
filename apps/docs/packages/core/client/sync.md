# Sync Sub-API (Hybrid Mode Only)

Hybrid mode keeps reads and writes local. The sync namespace only replicates
canonical memory files to the configured cloud service.

## `memo.sync.status`

Reads the cloud manifest, latest cursor, storage usage, and last-sync time.

```ts
const status = await memo.sync.status();
console.log(status.cursor, status.storageBytes);
```

## `memo.sync.push` and `memo.sync.complete`

Sync uses an explicit two-phase protocol. First, send a manifest and receive
presigned upload targets. Upload each target, then confirm the exact files you
uploaded with the returned cursor.

```ts
import { assertMemoryPath } from "@memofs/core";

const pushed = await memo.sync.push({
  projectId: memo.projectId,
  manifest,
});

for (const target of pushed.upload) {
  assertMemoryPath(target.path);
  const content = await memo.store.read(target.path);
  await fetch(target.presignedPutUrl, { method: "PUT", body: content });
}

await memo.sync.complete({
  projectId: memo.projectId,
  cursor: pushed.cursor,
  uploaded: pushed.upload.map(({ path, sha256 }) => ({ path, sha256 })),
});
```

`manifest` is a path-to-SHA-256 map for the local canonical files. The cloud
service verifies every uploaded hash before committing the manifest.

## `memo.sync.pull`

Pull accepts either your current manifest or a prior cursor. It downloads
changed files, removes server-deleted paths, and rebuilds local indexes.

```ts
await memo.sync.pull({
  projectId: memo.projectId,
  manifest,
});
```
