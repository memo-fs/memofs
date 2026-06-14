# TekMemo — BYOK and OSS Policy

## 1. BYOK definition

BYOK means **Bring Your Own Key**.

The user provides credentials for an external provider, such as:

- Voyage
- OpenAI
- Upstash
- Turso
- Qdrant
- Pinecone
- Cohere
- Jina

TekMemo packages should accept these keys as configuration.

TekMemo packages should not store provider secrets.

---

# 2. Package BYOK matrix

| Package | BYOK? | Notes |
|---|---:|---|
| `@tekbreed/tekmemo` | No | No provider dependency |
| `@tekbreed/tekmemo/fs` | No | Local filesystem only |
| `@tekbreed/tekmemo/agentfs` | Config-based | Depends on AgentFS/Turso setup |
| `@tekbreed/tekmemo/ai-sdk` | No | Should receive configured tools/runtime |
| `@tekbreed/tekmemo-voyage` | Yes | User can pass Voyage API key |
| `@tekbreed/tekmemo/openai` | Yes | User can pass OpenAI API key |
| `@tekbreed/tekmemo/recall` | No | Interface only |
| `@tekbreed/tekmemo-upstash` | Yes | User can pass Upstash credentials |
| `@tekbreed/tekmemo-turso-vector` | Yes | User can pass Turso/libSQL credentials |
| `@tekbreed/tekmemo-qdrant` | Yes | User can pass Qdrant URL/API key |
| `@tekbreed/tekmemo-pinecone` | Yes | User can pass Pinecone API key |
| `@tekbreed/tekmemo/rerank` | No | Interface only |
| `@tekbreed/tekmemo/rerank-voyage` | Yes | User can pass Voyage API key |
| `@tekbreed/tekmemo/rerank-cohere` | Yes | User can pass Cohere API key |
| `@tekbreed/tekmemo/rerank-jina` | Yes | User can pass Jina API key |

---

# 3. Cloud plan BYOK policy

## Developer Cloud
No BYOK.

Reason:
- keep free tier simple
- reduce support burden
- avoid abuse paths

## Pro
Allow:
- embedding BYOK
- rerank BYOK

Do not initially allow:
- vector provider BYOK

## Team
Allow:
- embedding BYOK
- rerank BYOK
- Upstash/Turso/Qdrant vector BYOK

## Business
Allow:
- embedding BYOK
- rerank BYOK
- vector BYOK
- Pinecone BYOK

## Enterprise
Custom BYOK.

May include:
- custom providers
- private deployment
- dedicated routing
- bring-your-own object storage
- compliance/security review

---

# 4. OSS policy

## Open source
All provider-neutral packages and provider adapters should be OSS.

## Closed source
TekMemo Cloud should remain closed.

Closed parts:
- billing
- quotas
- hosted BYOK encrypted storage
- tenant provider routing
- dashboard
- internal admin
- support tools

## Why
The OSS packages drive adoption.

The cloud product drives revenue.
