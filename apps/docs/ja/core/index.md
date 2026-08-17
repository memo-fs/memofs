---
title: "@memofs/core 概要"
description: "@memofs/core パッケージのコアアーキテクチャ、サブパスエクスポート、ランタイム境界、およびメモリプリミティブ。"
---

# `@memofs/core`

`@memofs/core` は、MemoFS のコアメモリランタイムおよびプロバイダー非依存の契約エンジンです。AI エージェント向けに、ファイルファーストでバージョン管理されたセマンティックメモリのアーキテクチャ基盤を提供します。

## サブパスエクスポート

最大のランタイム移植性を確保するため、`@memofs/core` は 3 つの独立したエントリーポイントに分かれています：

| サブパス | 対象環境 | 説明 |
|---|---|---|
| **`@memofs/core`** | Node.js, Cloudflare Workers, Deno, Bun, ブラウザ | **ルートエントリー (Worker 対応)。** 統合 `MemoFS` クライアント (`new MemoFS({ ... })`)、`RemoteBlobMemoryStore`、`InMemoryMemoryStore`、プロバイダー契約、グラフアルゴリズム、ハイブリッド想起、セキュリティゲート、および型定義を公開。POSIX ファイルシステムモジュールはインポートしません。 |
| **`@memofs/core/node-fs`** | Node.js (>= 22) | **Node.js 専用エントリー。** `createNodeMemoFs`（`new MemoFS` を返すゼロコンフィグファクトリ）、`createNodeFsMemoryStore`、`NodeFsMemoryStore`、同期設定リーダー `readMemoFsConfigFileSync`、およびテスト用一時ディレクトリヘルパーを提供。 |
| **`@memofs/core/cloud-client`** | すべての JavaScript ランタイム | **クラウド同期クライアント。** MemoFS Cloud に対する 2 フェーズのファイル複製を行う `createMemoFsCloudClient`、`createMemoFsCloudClientFromEnv`、`createProjectScopedClient` を公開。 |

## インストール

お好みのパッケージマネージャーを使用して `@memofs/core` をインストールします：

::: code-group

```sh [pnpm]
pnpm add @memofs/core
```

```sh [npm]
npm install @memofs/core
```

```sh [yarn]
yarn add @memofs/core
```

```sh [bun]
bun add @memofs/core
```

```sh [deno]
deno add npm:@memofs/core
```
:::

> [!NOTE]
> Node.js ランタイムで実行する場合は **Node.js >= 22** が必要です。

## クイックスタート

### 1. Node.js アプリケーション (推奨)

Node.js アプリケーションでは、`@memofs/core/node-fs` の `createNodeMemoFs` ファクトリを使用します。`.memofs/config.json` を自動的に解決し、`NodeFsMemoryStore` を初期化して、設定済みの `MemoFS` クライアントを返します：

```ts
import { createNodeMemoFs } from "@memofs/core/node-fs";

// rootDir に NodeFsMemoryStore を自動設定
const memofs = createNodeMemoFs({
  rootDir: ".",
  mode: "local",
});

// 正準 .memofs/ ファイルが存在しない場合は初期化
await memofs.bootstrap();

// 分類された永続メモリを書き込み
const result = await memofs.writeMemory({
  title: "データベース選定",
  content: "メタデータには Cloudflare D1、Blob ストレージには R2 を使用します。",
  kind: "decision",
  tags: ["architecture", "database"],
});
console.log(`メモリを保存しました ${result.id} (Tier: ${result.tier})`);

// 段階的開示プロンプトコンテキストを取得
const context = await memofs.context({
  query: "メタデータにはどのデータベースを使用していますか？",
  taskType: "coding",
  detail: "compact",
});
console.log(context.text);
```

### 2. Edge & Cloudflare Workers

`node:fs` が使用できない Cloudflare Workers やサーバーレス Edge ランタイムでは、`new MemoFS({ ... })` と Worker 対応のストレージアダプター（例: `@memofs/adapter-r2` と `@memofs/adapter-turso` を組み合わせた `RemoteBlobMemoryStore` や `InMemoryMemoryStore`）を使用してインスタンス化します：

```ts
import { MemoFS, RemoteBlobMemoryStore } from "@memofs/core";

// Worker 対応の Blob およびメタデータストレージアダプターを注入
const store = new RemoteBlobMemoryStore({
  blobClient: r2BlobClient,       // 例: @memofs/adapter-r2
  metadata: tursoMetadataStore,   // 例: @memofs/adapter-turso
  rootKey: "my-project-root",
});

const memofs = new MemoFS({
  store,
  projectId: "project-123",
  mode: "local",
});

// コアメモリを読み取り
const coreRules = await memofs.core.read();
console.log(coreRules);
```

## 主な機能

- **ファイルファーストの正準ストレージ:** すべてのメモリは `.memofs/` 配下の 11 個の正準 Markdown、JSON、JSONL ファイルに永続化されます。
- **書き込みインテリジェンスと安全性:** 組み込みのシークレットブロックリスト (`BLOCKLIST_RULES`) により、API キーやパスワードの混入を防止。耐久性階層 (`durable` と `transient`) により、作業メモを監査ログに記録しながら検索インデックスをクリーンに保ちます。
- **段階的コンテキスト提供:** `memofs.context()` はセクションカーソル (`expand`) を備えたトークン予算制御済みプロンプトブリーフィングを生成し、プロンプトの肥大化を防ぎます。
- **ハイブリッド想起と時間減衰:** BM25 語彙検索、あいまい一致、ベクトル埋め込みを指数関数的な新しさ減衰（30 日の半減期）と統合。
- **コードアンカリングとドリフト検出:** `AnchorRef` を通じてメモリをコードパスと SHA-256 ハ希にバインド。コード変更時に自動的に事実を `stale`（古い）状態に遷移させます。
- **ナレッジグラフと統合:** エンティティ-リレーションシップ三つ組の抽出、重み付き最短経路探索、重複エンティティのマージを自動実行。
- **エージェントワークスペース (AgentFS):** タスク完了時の自動永続メモリ抽出を備えた分離実行サンドボックス (`memofs.agentfs`) を提供。
- **2 フェーズクラウド同期:** 暗号ハッシュ検証と単調増加カーソルにより、ローカルメモリファイルを MemoFS Cloud に確実に複製。
