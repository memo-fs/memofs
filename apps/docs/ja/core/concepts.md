---
title: "コアメモリコンセプト"
description: "MemoFS における 11 個の正準ファイルレイアウト、耐久性階層、シークレット保護、コードアンカリング、メモリ減衰、およびナレッジグラフ。"
---

# コアコンセプト

MemoFS は、AI エージェントのメモリを構造化されたプロジェクトスコープの階層に整理します。取得頻度と目的に応じてメモリを分離することで、長期的なインテリジェンスを保持しながらコンテキストの肥大化を防ぎます。

## 11 個の正準ファイルレイアウト

ワークスペースのルート直下で、MemoFS は `.memofs/` ディレクトリ内の 11 個の正準ファイルを介してすべてのメモリ状態を管理します：

```
.memofs/
├── manifest.json              # [1]  追跡対象アセットとアンカーハッシュキャッシュ
├── memory/
│   ├── core.md                # [2]  コア正準ルールとベースライン事実
│   └── notes.md               # [3]  タイムスタンプ付きアーカイブメモリノート
├── events/
│   ├── memory-events.jsonl    # [4]  追記専用のメモリ書き込み・操作監査ログ
│   └── conversations.jsonl    # [5]  時系列の会話インタラクションログ
├── indexes/
│   ├── chunks.jsonl           # [6]  語彙想起用チャンク化テキストフラグメント
│   └── embeddings.jsonl       # [7]  永続化されたベクトル埋め込み
├── graph/
│   ├── nodes.jsonl            # [8]  エンティティノード (概念、ツール、決定事項)
│   └── edges.jsonl            # [9]  関係三つ組と依存関係エッジ
├── snapshots/
│   ├── snapshots.jsonl        # [10] チェックポイントインデックス
│   └── <snapshot-id>.json     # 動的スナップショットチェックポイント
├── connectors.json            # [11] 外部データソースコネクタ (シークレットなし)
├── archive/
│   └── <memory-id>.json       # コールドアーカイブされた高忠実度メモリレコード
└── tmp/                       # 一時ワークスペース作業ディレクトリ
```

### 正準ファイルリファレンス

| ファイル | プロトコル定数 | 形式 | アクセスパターン | 目的 |
|---|---|---|---|---|
| `.memofs/manifest.json` | `MANIFEST_PATH` | JSON | 起動時に読み取り | すべての正準パス、メタデータ、アンカーハッシュキャッシュのマニフェスト。 |
| `.memofs/memory/core.md` | `CORE_MEMORY_PATH` | Markdown | プロンプトコンテキストに読み込み | 簡潔で高シグナルなプロジェクト識別情報、ベースラインルールと制約。 |
| `.memofs/memory/notes.md` | `NOTES_MEMORY_PATH` | Markdown | 必要に応じて追記 | タイムスタンプ付きの長文ノート、決定事項、アーキテクチャ参照。 |
| `.memofs/events/memory-events.jsonl` | `MEMORY_EVENTS_PATH` | JSONL | 追記専用 | メモリ操作の監査ログ (`memory.created`, `memory.archived` 等)。 |
| `.memofs/events/conversations.jsonl` | `CONVERSATIONS_MEMORY_PATH` | JSONL | 追记専用 | 過去の経緯を再構成するための時系列エージェント会話ターン。 |
| `.memofs/indexes/chunks.jsonl` | `CHUNKS_INDEX_PATH` | JSONL | 想起時にクエリ | BM25 およびあいまい検索用のテキストチャンクと語彙メタデータ。 |
| `.memofs/indexes/embeddings.jsonl` | `EMBEDDINGS_INDEX_PATH` | JSONL | 想起時にクエリ | セマンティック類似度スコアリング用の永続化ベクトル埋め込み。 |
| `.memofs/graph/nodes.jsonl` | `GRAPH_NODES_PATH` | JSONL | グラフクエリ | エンティティ頂点 (機能、シンボル、概念、決定、アクター)。 |
| `.memofs/graph/edges.jsonl` | `GRAPH_EDGES_PATH` | JSONL | グラフクエリ | 関係エッジ (`depends_on`, `supersedes`, `uses`, `mentions`)。 |
| `.memofs/snapshots/snapshots.jsonl` | `SNAPSHOTS_INDEX_PATH` | JSONL | 必要に応じてクエリ | 利用可能なメモリスナップショットとチェックポイントを追跡するインデックス。 |
| `.memofs/connectors.json` | `CONNECTORS_PATH` | JSON | 同期単位 | 外部データソース (GitHub, Notion) の宣言。`secretRef` のみを使用。 |

## 耐久性階層 (`durable` と `transient`)

`memofs.writeMemory()` を介してメモリが書き込まれると、MemoFS はその耐久性階層を分類します：

- **`durable` (永続)**: 高価値の事実、決定事項、制約。`notes.md` に書き込まれ、`memory-events.jsonl` に記録され、**想起インデックスとナレッジグラフにインデックス化**されて将来のエージェントセッションを導きます。
- **`transient` (一時)**: スクラッチパッドの観察、一時的な作業状態、または低確信度の推測。監査証跡として `notes.md` と `memory-events.jsonl` に記録されますが、**想起インデックスやナレッジグラフには一切登録されません**。これにより、一時的な思考がプロンプトコンテキストを汚染するのを防ぎます。

## 書き込みブロックリストとシークレット保護

同期可能なメモリファイルへの認証情報の偶発的な漏洩を防ぐため、`memofs.writeMemory()`、`memofs.core.update()`、および `memofs.agentfs.complete()` によるすべての書き込みは**書き込みブロックリストゲート** (`assertWriteAllowed`) を通過します：

- **ゼロコンフィグ、常時有効:** ブロックリストは外部ネットワーク依存なしでローカルに実行されます。
- **完全拒否:** シークレットを含む書き込みは直ちに `MemoryWriteBlockedError` をスローし、ディスクには一切永続化されません。
- **安全なマスキング:** エラーメッセージや違反プレビューにはマスキングされたスニペット（最初の 3 文字 + `…` + 最後の 1 文字、例: `sk-…z`）のみが含まれます。
