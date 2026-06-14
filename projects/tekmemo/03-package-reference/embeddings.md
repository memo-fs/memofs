# Embedding Packages

## Packages

```txt
@tekbreed/tekmemo-voyage
@tekbreed/tekmemo/openai
```

## Purpose

Embedding packages convert memory text into vectors.

They should implement a provider-neutral embedder contract from `@tekbreed/tekmemo`.

---

# `@tekbreed/tekmemo-voyage`

## Use for

- default hosted embedding option
- BYOK Voyage users
- high-quality recall experiments

## Must handle

- empty input
- batch splitting
- model config
- dimension validation
- provider errors
- response count mismatch
- invalid vectors

---

# `@tekbreed/tekmemo/openai`

## Use for

- users already using OpenAI
- BYOK OpenAI workflows
- broad developer familiarity

## Must handle

- `text-embedding-3-small`
- `text-embedding-3-large`
- optional dimensions where supported
- no dimensions for unsupported legacy models
- response count mismatch
- invalid vectors

---

# BYOK rule

Both packages must accept an API key from the host app.

They must never store secrets.
