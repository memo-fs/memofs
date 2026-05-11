# Sync and events

Sync uses event-shaped changes so local and cloud runtimes can exchange memory updates.

## Push

A client sends local memory changes to Cloud.

## Pull

A client fetches server-side changes after a known version.

## Conflicts

Conflicts should be explicit and resolved with a clear policy: keep cloud, use client, manual, or ignore.
