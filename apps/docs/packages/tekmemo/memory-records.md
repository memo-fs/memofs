# Memory records

Memory records should be small, explicit, and durable.

## Kinds

| Kind | Meaning |
| --- | --- |
| `decision` | A project decision that should be remembered later. |
| `constraint` | A rule, limitation, or invariant. |
| `preference` | A human or team preference. |
| `reference` | A pointer to a document, file, or external source. |
| `summary` | Condensed project knowledge. |
| `note` | General durable memory. |

## Example

```bash
tekmemo remember "Billing webhooks must verify signatures before mutating state." \
  --kind constraint \
  --tag billing \
  --source architecture-review
```

## Good memory

Good memory is:

- specific
- source-aware
- free of secrets
- durable beyond one chat
- easy for a human to audit
