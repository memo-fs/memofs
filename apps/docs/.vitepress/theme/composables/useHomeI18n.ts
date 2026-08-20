import { useData } from "vitepress";
import { computed } from "vue";

export interface HomeTranslations {
	pill: {
		badge: string;
		text: string;
	};
	dualEntry: {
		user: {
			badge: string;
			title: string;
			desc: string;
			primaryLinkText: string;
			primaryLink: string;
			secondaryLinkText: string;
			secondaryLink: string;
		};
		builder: {
			badge: string;
			title: string;
			desc: string;
			primaryLinkText: string;
			primaryLink: string;
			secondaryLinkText: string;
			secondaryLink: string;
		};
	};
	credibility: {
		kicker: string;
		starsLabel: string;
		downloadsLabel: string;
	};
	problem: {
		kicker: string;
		headline: string;
		headlineEm: string;
		body1: string;
		body2: string;
		symptoms: Array<{
			title: string;
			desc: string;
		}>;
	};
	howItWorks: {
		kicker: string;
		headline: string;
		step1: {
			title: string;
			req: string;
		};
		step2: {
			title: string;
			output: string;
		};
		step3: {
			title: string;
			outputs: string[];
		};
		step4: {
			title: string;
			output: string;
		};
		resultText: string;
	};
	stats: {
		kicker: string;
		subtitle: string;
		items: Array<{
			label: string;
			detail: string;
		}>;
		sourceText: string;
		sourceLinkText: string;
	};
	runtimes: {
		kicker: string;
		title: string;
		lede: string;
		local: {
			kicker: string;
			title: string;
			desc: string;
			codeComment: string;
		};
		hybrid: {
			kicker: string;
			title: string;
			desc: string;
			codeComment: string;
		};
		managed: {
			kicker: string;
			title: string;
			desc: string;
			btnText: string;
		};
	};
	comparison: {
		kicker: string;
		title: string;
		lede: string;
		headers: {
			feature: string;
			memofs: string;
			hosted: string;
		};
		rows: Array<{
			feature: string;
			memofs: string;
			hosted: string;
		}>;
		support: {
			kicker: string;
			body: string;
			starBtn: string;
			sponsorBtn: string;
		};
	};
	bottomCta: {
		badge: string;
		headline: string;
		primaryBtn: string;
		primaryLink: string;
		secondaryBtn: string;
		githubLink: string;
	};
}

const en: HomeTranslations = {
	pill: {
		badge: "Cloud",
		text: "MemoFS Cloud",
	},
	dualEntry: {
		user: {
			badge: "AI Agents & IDEs",
			title: "I use AI agents day-to-day",
			desc: "Claude Code, Cursor, Windsurf, research tools, and custom agents automatically read & write persistent, git-trackable memory via MCP or lifecycle hooks.",
			primaryLinkText: "MCP Setup Guide →",
			primaryLink: "/mcp/",
			secondaryLinkText: "View Agent Cookbooks →",
			secondaryLink: "/learn/cookbooks/",
		},
		builder: {
			badge: "Core SDK & Server",
			title: "I'm building AI agents & apps",
			desc: "Import @memofs/core or @memofs/server for a lightweight, file-first, zero-database memory runtime with semantic recall.",
			primaryLinkText: "Read Core SDK Docs →",
			primaryLink: "/core/",
			secondaryLinkText: "API Reference →",
			secondaryLink: "/api/",
		},
	},
	credibility: {
		kicker: "Works out of the box with your stack",
		starsLabel: "GitHub stars",
		downloadsLabel: "downloads/week",
	},
	problem: {
		kicker: "The problem",
		headline: "Every new session ",
		headlineEm: "starts from zero.",
		body1:
			"You brief your agent on your project, domain rules, and key constraints. It gets it. Next session — a blank stare. You re-explain everything, only for it to contradict yesterday's decisions. It has no memory of what you chose, because there was nowhere durable to put it.",
		body2:
			"And giving one agent a local scratchpad only shrinks the problem — it doesn't solve it. Every machine, tool, and teammate ends up with fractured, divergent memory you can't inspect or trust:",
		symptoms: [
			{
				title: "Divergent.",
				desc: "Your desktop, cloud instances, and your teammates' agents each remember conflicting, fragmented context.",
			},
			{
				title: "Invisible.",
				desc: "You can't see what your agents have recorded, so you can't trust it — or correct it when they learn bad assumptions.",
			},
			{
				title: "Unreachable.",
				desc: "Hosted agents, serverless functions, and remote workflows start from scratch on every invocation with no shared ground truth.",
			},
		],
	},
	howItWorks: {
		kicker: "How it works",
		headline: "Four commands. Your agent remembers.",
		step1: {
			title: "Install",
			req: "Requires Node.js >= 22",
		},
		step2: {
			title: "Initialize",
			output:
				"✓ Initialized .memofs at /Path/to/your/project (Project ID: none)",
		},
		step3: {
			title: "Generate",
			outputs: [
				"✓ Generated CLAUDE.md",
				"✓ Generated .claude/settings.json",
				"✓ Created .mcp.json (local)",
			],
		},
		step4: {
			title: "Record",
			output: "✓ Stored decision memory in .memofs/memory/notes.md",
		},
		resultText:
			'Next session, your agent already knows. No repeating yourself. No contradictions. No "what were we working on again?"',
	},
	stats: {
		kicker: "Performance",
		subtitle:
			"Measured locally, on synthetic data — your numbers will vary by embedding provider and dataset size.",
		items: [
			{
				label: "Recall p50",
				detail: "Top-10 in-memory recall over a full project memory set.",
			},
			{
				label: "Round-trip p50",
				detail: "Full read + write lifecycle for the core memory store.",
			},
			{
				label: "Rerank p50",
				detail: "Deterministic top-5 rerank after recall.",
			},
		],
		sourceText: "Full methodology in",
		sourceLinkText: "benchmark-kit",
	},
	runtimes: {
		kicker: "Runtimes",
		title: "One engine, three storage modes",
		lede: "MemoFS is built on a unified store abstraction. Choose where your memory resides based on your workflow and access needs.",
		local: {
			kicker: "Local mode",
			title: "Offline storage",
			desc: "All memory is written directly to your project's local file system as markdown and JSON. Fast, offline-first, optimal recall intelligence, and zero network latency.",
			codeComment: "// All memory stays on disk — offline-first.",
		},
		hybrid: {
			kicker: "Hybrid mode",
			title: "Cloud synchronized",
			desc: "Stores files locally for speed, but automatically synchronizes replicas to MemoFS Cloud so your agent memory follows you across development machines.",
			codeComment: "// Local speed + cloud replica.",
		},
		managed: {
			kicker: "Managed · MCP endpoint live",
			title: "Memory as an API",
			desc: "MemoFS Cloud hosts the engine. Any MCP client — Cursor, Claude, a hosted agent on a machine with no checkout — reads and writes memory through one hosted MCP URL plus an API key, with zero local files. A raw HTTPS API for CI pipelines, edge functions, and chatbots is next. Your files stay the source of truth: leaving is a config change, not a migration.",
			btnText: "Explore MemoFS Cloud →",
		},
	},
	comparison: {
		kicker: "Why file-first",
		title: "MemoFS vs. hosted memory tools",
		lede: "Most memory tools hide your data in an opaque dashboard or black-box vector store. MemoFS stores everything as plain text and JSON in your workspace's .memofs/ directory — inspectable, diffable, and fully owned by you.",
		headers: {
			feature: "Feature",
			memofs: "MemoFS",
			hosted: "Hosted Memory Tools",
		},
		rows: [
			{
				feature: "Where memory lives",
				memofs: "Plain files in your workspace",
				hosted: "Locked in a remote dashboard",
			},
			{
				feature: "Inspect & edit",
				memofs: "Any editor, any diff tool",
				hosted: "Vendor UI only",
			},
			{
				feature: "Version control",
				memofs: "Git-tracked with your project",
				hosted: "Separate system (if at all)",
			},
			{
				feature: "Ownership",
				memofs: "You own every byte",
				hosted: "Vendor-dependent",
			},
			{
				feature: "Offline support",
				memofs: "Full offline by default",
				hosted: "Requires internet",
			},
		],
		support: {
			kicker: "Support MemoFS",
			body: "If MemoFS saves you time, a star helps others find it. If it helps your work, consider sponsoring.",
			starBtn: "Star on GitHub",
			sponsorBtn: "Sponsor on GitHub",
		},
	},
	bottomCta: {
		badge: "MIT Licensed · 100% open source",
		headline: "One command. Your agent never forgets.",
		primaryBtn: "Read the Quick Start →",
		primaryLink: "/introduction",
		secondaryBtn: "Explore MemoFS Cloud →",
		githubLink: "View on GitHub",
	},
};

const zh: HomeTranslations = {
	pill: {
		badge: "云端服务",
		text: "MemoFS Cloud",
	},
	dualEntry: {
		user: {
			badge: "AI 智能体与 IDE",
			title: "日常使用 AI 智能体",
			desc: "Claude Code、Cursor、Windsurf、研究助手与自定义智能体通过 MCP 或生命周期钩子，自动读写持久化、可 Git 跟踪的记忆。",
			primaryLinkText: "MCP 配置指南 →",
			primaryLink: "/mcp/",
			secondaryLinkText: "查看智能体实战菜谱 →",
			secondaryLink: "/learn/cookbooks/",
		},
		builder: {
			badge: "核心 SDK 与服务端",
			title: "构建 AI 智能体与应用",
			desc: "导入 @memofs/core 或 @memofs/server，配备轻量级、文件优先、无需独立数据库且支持语义召回的记忆运行时。",
			primaryLinkText: "阅读核心 SDK 文档 →",
			primaryLink: "/zh/core/",
			secondaryLinkText: "API 参考文档 →",
			secondaryLink: "/api/",
		},
	},
	credibility: {
		kicker: "开箱即用，完美适配主流技术栈",
		starsLabel: "GitHub Star 数量",
		downloadsLabel: "每周下载量",
	},
	problem: {
		kicker: "核心痛点",
		headline: "每次开启新会话，智能体都",
		headlineEm: "从零开始。",
		body1:
			"你向智能体详细阐述了业务规则、领域约束与决策准则，它当下理解了。但在下一次会话中 —— 再次陷入茫然。你不得不反复解释，而它给出的结论甚至与昨天的决定互相矛盾。因为过去根本无处持久化存放这些关键记忆。",
		body2:
			"只给单个智能体配备临时草稿纸只是缓解了局部问题 —— 并未根本解决。不同设备、云端环境与每位队友的智能体保留着互不相同的孤立记忆，而且你完全无法直观查看或纠偏：",
		symptoms: [
			{
				title: "记忆发散不一致。",
				desc: "本地设备、云端环境与队友的智能体各自记住互不相同的碎片上下文。",
			},
			{
				title: "黑盒不可见。",
				desc: "你无法直观查看智能体记录了什么，因此无法给予充分信任 —— 出现错误假设时更无法主动纠错。",
			},
			{
				title: "无法触达。",
				desc: "无共享状态意味着无记忆可用：无服务器函数、云端容器与托管智能体每次都必须从零开始。",
			},
		],
	},
	howItWorks: {
		kicker: "工作原理",
		headline: "仅需四条命令，智能体永久铭记。",
		step1: {
			title: "安装",
			req: "运行需要 Node.js >= 22",
		},
		step2: {
			title: "初始化",
			output: "✓ 已在 /项目路径 初始化 .memofs (Project ID: none)",
		},
		step3: {
			title: "生成配置",
			outputs: [
				"✓ 已生成 CLAUDE.md",
				"✓ 已生成 .claude/settings.json",
				"✓ 已创建 .mcp.json (local)",
			],
		},
		step4: {
			title: "记录记忆",
			output: "✓ 已在 .memofs/memory/notes.md 中存储决策记忆",
		},
		resultText:
			"在下一次会话中，智能体已全面知晓上下文。无需重复说明，绝无决策冲突，告别“我们刚才做到哪了？”的尴尬。",
	},
	stats: {
		kicker: "性能指标",
		subtitle:
			"本地基准测试结果（基于合成数据）—— 实际性能会因 Embedding 提供商及数据集规模有所差异。",
		items: [
			{
				label: "召回 p50 延迟",
				detail: "在完整项目记忆集上执行 Top-10 内存召回。",
			},
			{
				label: "读写往返 p50",
				detail: "核心记忆存储层的完整读取与写入生命周期。",
			},
			{
				label: "重排序 p50",
				detail: "在召回后执行确定性 Top-5 重排序计算。",
			},
		],
		sourceText: "完整测试方法论详见",
		sourceLinkText: "benchmark-kit 基准测试套件",
	},
	runtimes: {
		kicker: "运行模式",
		title: "统一引擎，三种存储模式",
		lede: "MemoFS 构建在统一的存储抽象之上。根据你的工作流与访问需求自由选择记忆存放位置。",
		local: {
			kicker: "本地模式",
			title: "离线文件存储",
			desc: "所有记忆直接以 Markdown 和 JSON 形式写入项目的本地文件系统。速度极快、离线优先、具备最佳召回智能且零网络延迟。",
			codeComment: "// 所有记忆完整保存在本地磁盘 —— 离线优先。",
		},
		hybrid: {
			kicker: "混合模式",
			title: "云端自动同步",
			desc: "文件本地存储以保障极致速度，同时自动将副本同步至 MemoFS Cloud，让智能体记忆伴随你在多台开发设备间无缝流转。",
			codeComment: "// 本地极致速度 + 云端多端副本。",
		},
		managed: {
			kicker: "托管模式 · MCP 端点实时在线",
			title: "记忆即 API",
			desc: "MemoFS Cloud 托管核心引擎。任何 MCP 客户端（Cursor、Claude 或无代码检出的托管智能体）只需一个 MCP URL 与 API Key 即可读写记忆，无需本地文件。你的代码文件始终是第一真理来源：迁移离开仅需更改配置，无需数据迁移。",
			btnText: "探索 MemoFS Cloud →",
		},
	},
	comparison: {
		kicker: "为何坚持文件优先",
		title: "MemoFS 与传统云端记忆工具对比",
		lede: "多数记忆工具将你的数据隐藏在黑盒向量数据库或不可视察的远程控制台中。MemoFS 将所有内容作为纯文本和 JSON 保存在工作区的 .memofs/ 目录下 —— 可视察、可 Diff，完全由你掌控。",
		headers: {
			feature: "对比维度",
			memofs: "MemoFS",
			hosted: "传统云端记忆服务",
		},
		rows: [
			{
				feature: "记忆存放位置",
				memofs: "工作区中的纯文本文件",
				hosted: "锁定在厂商的远程控制台",
			},
			{
				feature: "查看与编辑",
				memofs: "任意编辑器、任意 Diff 工具",
				hosted: "仅限厂商专属 UI",
			},
			{
				feature: "版本控制",
				memofs: "与项目数据一同 Git 跟踪",
				hosted: "独立的黑盒系统（如有）",
			},
			{
				feature: "数据所有权",
				memofs: "你拥有每一个字节",
				hosted: "完全受制于第三方平台",
			},
			{
				feature: "离线工作支持",
				memofs: "默认完全支持离线",
				hosted: "必须依赖持续网络连接",
			},
		],
		support: {
			kicker: "支持 MemoFS",
			body: "如果 MemoFS 为你节省了宝贵时间，在 GitHub 点亮 Star 能帮助更多开发者发现它。如果它助力了你的商业项目，欢迎赞助支持。",
			starBtn: "在 GitHub 上点亮 Star",
			sponsorBtn: "赞助 MemoFS",
		},
	},
	bottomCta: {
		badge: "MIT 开源协议 · 100% 开放源代码",
		headline: "一条命令，赋予智能体永不磨灭的记忆。",
		primaryBtn: "阅读快速开始指南 →",
		primaryLink: "/zh/introduction",
		secondaryBtn: "探索 MemoFS Cloud →",
		githubLink: "在 GitHub 上查看源码",
	},
};

const ja: HomeTranslations = {
	pill: {
		badge: "クラウド",
		text: "MemoFS Cloud",
	},
	dualEntry: {
		user: {
			badge: "AI エージェント & IDE",
			title: "日常的に AI エージェントを使う",
			desc: "Claude Code、Cursor、Windsurf、リサーチツール、カスタムエージェントが MCP やライフサイクルフックを通じて、Git 追跡可能な永続メモリを自動的に読み書きします。",
			primaryLinkText: "MCP セットアップガイド →",
			primaryLink: "/mcp/",
			secondaryLinkText: "エージェント クックブックを見る →",
			secondaryLink: "/learn/cookbooks/",
		},
		builder: {
			badge: "コア SDK & サーバー",
			title: "AI エージェント & アプリを開発する",
			desc: "@memofs/core または @memofs/server をインポートして、セマンティック想起を備えた軽量・ファイルファースト・データベース不要のメモリランタイムを構築します。",
			primaryLinkText: "コア SDK ドキュメントを読む →",
			primaryLink: "/ja/core/",
			secondaryLinkText: "API リファレンス →",
			secondaryLink: "/api/",
		},
	},
	credibility: {
		kicker: "主要な開発スタックとシームレスに連携",
		starsLabel: "GitHub スター数",
		downloadsLabel: "週間ダウンロード数",
	},
	problem: {
		kicker: "解決する課題",
		headline: "新しいセッションは毎回、",
		headlineEm: "ゼロから始まります。",
		body1:
			"プロジェクトの前提、ドメインルール、重要な制約をエージェントに説明すると、その場では理解します。しかし次のセッションでは再び記憶がリセットされます。何度も同じ説明を繰り返すことになり、前回の決定と矛盾する回答が返ってくることもあります。決定事項を永続的に保持する場所が存在しないからです。",
		body2:
			"1 つのエージェントに一時的な作業スペースを持たせるだけでは根本的な解決になりません。マシン、クラウド環境、チームメンバーごとに孤立したメモリが散在し、中身を直接確認することも修正することもできません：",
		symptoms: [
			{
				title: "記憶の不一致。",
				desc: "ローカル環境、クラウドサービス、チームメンバーのエージェントがそれぞれ異なる断片的なコンテキストを記憶してしまいます。",
			},
			{
				title: "ブラックボックス。",
				desc: "エージェントが何を記録したのかが見えないため、信頼することも誤った前提を修正することもできません。",
			},
			{
				title: "共有不能。",
				desc: "ホスト型エージェント、サーバーレス関数、リモートワークフローは、共通のメモリ基盤がないため毎回ゼロスタートを強いられます。",
			},
		],
	},
	howItWorks: {
		kicker: "仕組み",
		headline: "わずか 4 つのコマンドで、エージェントが記憶。",
		step1: {
			title: "インストール",
			req: "Node.js >= 22 が必要です",
		},
		step2: {
			title: "初期化",
			output:
				"✓ /プロジェクトパス に .memofs を初期化しました (Project ID: none)",
		},
		step3: {
			title: "設定生成",
			outputs: [
				"✓ CLAUDE.md を生成しました",
				"✓ .claude/settings.json を生成しました",
				"✓ .mcp.json (local) を作成しました",
			],
		},
		step4: {
			title: "記録",
			output: "✓ .memofs/memory/notes.md に意思決定メモリを保存しました",
		},
		resultText:
			"次のセッションでは、エージェントはすでにすべてを把握しています。同じ説明を繰り返す必要も、決定事項の矛盾もなくなります。",
	},
	stats: {
		kicker: "パフォーマンス",
		subtitle:
			"ローカル環境で合成データを使用して測定 — 実際の数値は Embedding プロバイダーやデータセットサイズにより変動します。",
		items: [
			{
				label: "想起 p50 レイテンシ",
				detail:
					"プロジェクト全体のメモリセットに対する Top-10 インメモリ想起。",
			},
			{
				label: "ラウンドトリップ p50",
				detail:
					"コアメモリストアの完全な読み取りおよび書き込みライフサイクル。",
			},
			{
				label: "リランク p50",
				detail: "想起後の決定論的 Top-5 リランク処理。",
			},
		],
		sourceText: "詳細な検証手法は",
		sourceLinkText: "benchmark-kit",
	},
	runtimes: {
		kicker: "ランタイム",
		title: "1 つのエンジン、3 つのストレージモード",
		lede: "MemoFS は統一されたストア抽象の上に構築されています。ワークフローと要件に合わせて最適なメモリの配置場所を選択できます。",
		local: {
			kicker: "ローカルモード",
			title: "オフラインストレージ",
			desc: "すべてのメモリは Markdown および JSON としてプロジェクトのローカルファイルシステムに直接書き込まれます。超高速、オフラインファースト、ネットワーク遅延ゼロ。",
			codeComment:
				"// すべてのメモリはローカルディスクに保持 — オフラインファースト。",
		},
		hybrid: {
			kicker: "ハイブリッドモード",
			title: "クラウド同期",
			desc: "ローカルの高速性を維持しながら、MemoFS Cloud へ自動的にレプリカを同期。複数の開発マシン間でエージェントのメモリをシームレスに共有できます。",
			codeComment: "// ローカルの高速性 + クラウド同期レプリカ。",
		},
		managed: {
			kicker: "マネージドモード · ホスト型 MCP 提供中",
			title: "API としてのメモリ",
			desc: "MemoFS Cloud がエンジンをホスト。ホスト型 MCP URL と API キーを指定するだけで、ローカルファイルを持たない環境でもメモリを即座に読み書きできます。コードファイルが常に真理の源であり続けます。",
			btnText: "MemoFS Cloud を見る →",
		},
	},
	comparison: {
		kicker: "ファイルファーストの理由",
		title: "MemoFS と従来のホスト型メモリツールの比較",
		lede: "多くのメモリツールはデータをブラックボックスのベクトルデータベースやリモートダッシュボードに隔離します。MemoFS はすべてをワークスペースの .memofs/ ディレクトリ内にプレーンテキストと JSON で保存し、ユーザー自身が完全に所有・検証できます。",
		headers: {
			feature: "機能・特徴",
			memofs: "MemoFS",
			hosted: "ホスト型メモリツール",
		},
		rows: [
			{
				feature: "メモリの保存場所",
				memofs: "ワークスペース内のプレーンファイル",
				hosted: "リモートダッシュボードに隔離",
			},
			{
				feature: "確認・編集",
				memofs: "任意のテキストエディタ、Diff ツール",
				hosted: "ベンダー専用 UI のみ",
			},
			{
				feature: "バージョン管理",
				memofs: "プロジェクトと一緒に Git で追跡",
				hosted: "別系統のシステム（または非対応）",
			},
			{
				feature: "所有権",
				memofs: "すべてのデータをユーザーが完全に所有",
				hosted: "ベンダー依存",
			},
			{
				feature: "オフライン動作",
				memofs: "デフォルトで完全なオフライン対応",
				hosted: "常時インターネット接続が必須",
			},
		],
		support: {
			kicker: "MemoFS を応援する",
			body: "MemoFS が役立ちましたら、GitHub スターをつけて応援してください。プロジェクトを気に入っていただけましたらスポンサーも歓迎しています。",
			starBtn: "GitHub でスターをつける",
			sponsorBtn: "GitHub でスポンサーになる",
		},
	},
	bottomCta: {
		badge: "MIT ライセンス · 100% オープンソース",
		headline: "1 つのコマンドで、エージェントは決して忘れません。",
		primaryBtn: "クイックスタートを読む →",
		primaryLink: "/ja/introduction",
		secondaryBtn: "MemoFS Cloud を見る →",
		githubLink: "GitHub で確認する",
	},
};

const es: HomeTranslations = {
	pill: {
		badge: "Nube",
		text: "MemoFS Cloud",
	},
	dualEntry: {
		user: {
			badge: "Agentes de IA e IDEs",
			title: "Uso agentes de IA en mi día a día",
			desc: "Claude Code, Cursor, Windsurf, asistentes de investigación y agentes personalizados leen y escriben automáticamente memoria persistente y rastreable por Git a través de MCP o ganchos de ciclo de vida.",
			primaryLinkText: "Guía de Configuración MCP →",
			primaryLink: "/mcp/",
			secondaryLinkText: "Ver Recetarios de Agentes →",
			secondaryLink: "/learn/cookbooks/",
		},
		builder: {
			badge: "SDK Principal y Servidor",
			title: "Estoy construyendo agentes y apps de IA",
			desc: "Importa @memofs/core o @memofs/server para obtener un entorno de memoria ligero, basado en archivos, sin base de datos y con recuperación semántica.",
			primaryLinkText: "Leer Docs del SDK Principal →",
			primaryLink: "/es/core/",
			secondaryLinkText: "Referencia de API →",
			secondaryLink: "/api/",
		},
	},
	credibility: {
		kicker: "Funciona de inmediato con tu pila tecnológica",
		starsLabel: "Estrellas en GitHub",
		downloadsLabel: "descargas/semana",
	},
	problem: {
		kicker: "El problema",
		headline: "Cada nueva sesión ",
		headlineEm: "comienza desde cero.",
		body1:
			"Le explicas a tu agente las reglas del proyecto, los requisitos del dominio y las restricciones clave. Lo entiende. En la siguiente sesión: mirada en blanco. Tienes que volver a explicarlo todo, y genera respuestas que contradicen las decisiones anteriores. No recuerda lo que acordasteis porque no había dónde guardarlo.",
		body2:
			"Y darle a un solo agente un bloc de notas temporal solo mitiga el problema, no lo resuelve. Cada máquina, servicio en la nube y compañero de equipo termina con una memoria fragmentada que no puedes inspeccionar ni confiar:",
		symptoms: [
			{
				title: "Divergente.",
				desc: "Tu equipo local, las instancias en la nube y los agentes de tus compañeros recuerdan contextos fragmentados y contradictorios.",
			},
			{
				title: "Invisible.",
				desc: "No puedes ver lo que tus agentes han registrado, por lo que no puedes confiar en ello ni corregir suposiciones erróneas.",
			},
			{
				title: "Inaccesible.",
				desc: "Agentes alojados, funciones serverless y flujos remotos empiezan de cero en cada ejecución sin una verdad compartida.",
			},
		],
	},
	howItWorks: {
		kicker: "Cómo funciona",
		headline: "Cuatro comandos. Tu agente recuerda.",
		step1: {
			title: "Instalar",
			req: "Requiere Node.js >= 22",
		},
		step2: {
			title: "Inicializar",
			output:
				"✓ .memofs inicializado en /ruta/a/tu/proyecto (Project ID: none)",
		},
		step3: {
			title: "Generar",
			outputs: [
				"✓ CLAUDE.md generado",
				"✓ .claude/settings.json generado",
				"✓ .mcp.json (local) creado",
			],
		},
		step4: {
			title: "Registrar",
			output: "✓ Memoria de decisión guardada en .memofs/memory/notes.md",
		},
		resultText:
			"En la siguiente sesión, tu agente ya lo sabe todo. Sin repetir explicaciones. Sin contradicciones. Sin «¿en qué estábamos trabajando?».",
	},
	stats: {
		kicker: "Rendimiento",
		subtitle:
			"Medido localmente con datos sintéticos; los resultados pueden variar según el proveedor de embeddings y el tamaño del conjunto de datos.",
		items: [
			{
				label: "Recuperación p50",
				detail:
					"Recuperación en memoria Top-10 sobre el conjunto de memoria del proyecto.",
			},
			{
				label: "Ciclo completo p50",
				detail:
					"Ciclo completo de lectura y escritura para el almacén de memoria principal.",
			},
			{
				label: "Reordenación p50",
				detail: "Reordenación determinista Top-5 tras la recuperación.",
			},
		],
		sourceText: "Metodología completa en",
		sourceLinkText: "benchmark-kit",
	},
	runtimes: {
		kicker: "Entornos de ejecución",
		title: "Un solo motor, tres modos de almacenamiento",
		lede: "MemoFS está construido sobre una abstracción de almacenamiento unificada. Elige dónde reside tu memoria según tu flujo de trabajo.",
		local: {
			kicker: "Modo Local",
			title: "Almacenamiento sin conexión",
			desc: "Toda la memoria se escribe directamente en el sistema de archivos local de tu proyecto como Markdown y JSON. Rápido, offline-first y con cero latencia de red.",
			codeComment: "// Toda la memoria permanece en el disco — offline-first.",
		},
		hybrid: {
			kicker: "Modo Híbrido",
			title: "Sincronizado con la Nube",
			desc: "Almacena localmente para máxima velocidad, pero sincroniza réplicas automáticamente con MemoFS Cloud para que la memoria te acompañe entre máquinas de desarrollo.",
			codeComment: "// Velocidad local + réplica en la nube.",
		},
		managed: {
			kicker: "Administrado · Punto final MCP disponible",
			title: "Memoria como una API",
			desc: "MemoFS Cloud aloja el motor. Cualquier cliente MCP (Cursor, Claude o un agente alojado sin repositorio local) lee y escribe memoria a través de una URL MCP alojada y una clave API, sin archivos locales. Tus archivos siguen siendo la fuente de la verdad.",
			btnText: "Explorar MemoFS Cloud →",
		},
	},
	comparison: {
		kicker: "Por qué basado en archivos",
		title: "MemoFS frente a herramientas de memoria alojadas",
		lede: "La mayoría de herramientas ocultan tus datos en paneles remotos o almacenes vectoriales de caja negra. MemoFS almacena todo como texto plano y JSON en el directorio .memofs/ de tu espacio de trabajo — inspeccionable, auditable y de tu total propiedad.",
		headers: {
			feature: "Característica",
			memofs: "MemoFS",
			hosted: "Herramientas de Memoria Alojadas",
		},
		rows: [
			{
				feature: "Dónde reside la memoria",
				memofs: "Archivos de texto plano en tu espacio de trabajo",
				hosted: "Bloqueada en un panel remoto",
			},
			{
				feature: "Inspeccionar y editar",
				memofs: "Cualquier editor, cualquier herramienta de diff",
				hosted: "Solo la interfaz del proveedor",
			},
			{
				feature: "Control de versiones",
				memofs: "Rastreado por Git junto a tu proyecto",
				hosted: "Sistema separado (si existe)",
			},
			{
				feature: "Propiedad de los datos",
				memofs: "Eres dueño de cada byte",
				hosted: "Dependiente del proveedor",
			},
			{
				feature: "Soporte sin conexión",
				memofs: "Totalmente offline por defecto",
				hosted: "Requiere conexión a internet",
			},
		],
		support: {
			kicker: "Apoya a MemoFS",
			body: "Si MemoFS te ahorra tiempo, una estrella en GitHub ayuda a otros a descubrirlo. Si beneficia tu trabajo, considera patrocinarlo.",
			starBtn: "Dar estrella en GitHub",
			sponsorBtn: "Patrocinar en GitHub",
		},
	},
	bottomCta: {
		badge: "Licencia MIT · 100% código abierto",
		headline: "Un solo comando. Tu agente nunca olvidará.",
		primaryBtn: "Leer los Primeros Pasos →",
		primaryLink: "/es/introduction",
		secondaryBtn: "Explorar MemoFS Cloud →",
		githubLink: "Ver en GitHub",
	},
};

export function useHomeI18n() {
	const { lang } = useData();

	const t = computed<HomeTranslations>(() => {
		if (lang.value === "zh-CN") return zh;
		if (lang.value === "ja-JP") return ja;
		if (lang.value === "es-ES") return es;
		return en;
	});

	return { t };
}
