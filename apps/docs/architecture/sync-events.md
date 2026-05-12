# Sync and events

TekMemo supports a "hybrid" mode where memory is stored locally in `.tekmemo/` files but backed up and shared via TekMemo Cloud. 

To make this possible without constantly overwriting files, TekMemo uses an event-sourced architecture. Every change to memory (adding a note, updating core, removing a chunk) is recorded as a discrete event.

## Push

When a client wants to sync local changes to the cloud, it performs a **Push**:
1. The local runtime reads `events.jsonl` to find all events that have not yet been synced.
2. The events are sent to the Cloud API.
3. The Cloud API replays the events against the hosted database, updating the remote `core.md` and `notes.md` state.

```bash
npx tekmemo cloud sync push
```

## Pull

When a client wants to fetch remote changes from the cloud, it performs a **Pull**:
1. The client asks the Cloud API for any events that occurred after the client's last known version.
2. The Cloud API returns the event ledger.
3. The local runtime replays those events against the local `.tekmemo/` files, bringing them up to date.

```bash
npx tekmemo cloud sync pull
```

## Conflicts

Because multiple agents (or humans) might edit memory at the same time, conflicts can occur. 

When a conflict is detected during a pull, TekMemo does not arbitrarily overwrite your files. Instead, it pauses the sync and asks you to resolve the conflict using a clear policy:
- **keep-cloud**: Overwrite local changes with the cloud's version.
- **use-client**: Force the cloud to accept the local changes.
- **manual**: Let the user manually edit the conflicting text blocks.

```bash
npx tekmemo cloud sync resolve --policy keep-cloud
```
