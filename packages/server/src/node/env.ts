import { createLocalObjectStore } from "./local-object-store.js";
import { createPostgresJobQueue } from "./postgres-job-queue.js";
import { createPostgresTekMemoStore } from "./postgres-store.js";
import { createS3ObjectStore } from "./s3-object-store.js";

export interface TekMemoNodeRuntimeConfig {
	port: number;
	apiKeys: string[];
	defaultProjectId: string;
	databaseUrl?: string;
	objectStore: "none" | "local" | "s3";
	queue: "none" | "postgres";
	localObjectRoot: string;
}

export function readTekMemoNodeRuntimeConfig(
	env: NodeJS.ProcessEnv = process.env,
): TekMemoNodeRuntimeConfig {
	return {
		port: Number(env.PORT ?? 8787),
		apiKeys: (env.TEKMEMO_API_KEYS ?? env.TEKMEMO_API_KEY ?? "")
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean),
		defaultProjectId: env.TEKMEMO_DEFAULT_PROJECT_ID ?? "default",
		databaseUrl: env.TEKMEMO_DATABASE_URL ?? env.DATABASE_URL,
		objectStore: parseObjectStore(env.TEKMEMO_OBJECT_STORE),
		queue: parseQueue(env.TEKMEMO_QUEUE),
		localObjectRoot: env.TEKMEMO_LOCAL_OBJECT_ROOT ?? ".tekmemo/objects",
	};
}

export function createNodeTekMemoStore(
	config = readTekMemoNodeRuntimeConfig(),
) {
	if (!config.databaseUrl) {
		throw new Error(
			"TEKMEMO_DATABASE_URL or DATABASE_URL is required for the Node self-host server.",
		);
	}
	return createPostgresTekMemoStore({
		connectionString: config.databaseUrl,
		defaultProjectId: config.defaultProjectId,
	});
}

export function createNodeTekMemoQueue(
	config = readTekMemoNodeRuntimeConfig(),
) {
	if (config.queue === "none") return undefined;
	if (!config.databaseUrl) {
		throw new Error(
			"A Postgres queue requires TEKMEMO_DATABASE_URL or DATABASE_URL.",
		);
	}
	return createPostgresJobQueue({ connectionString: config.databaseUrl });
}

export function createNodeTekMemoObjectStore(
	config = readTekMemoNodeRuntimeConfig(),
) {
	if (config.objectStore === "none") return undefined;
	if (config.objectStore === "local") {
		return createLocalObjectStore({ rootDir: config.localObjectRoot });
	}
	return createS3ObjectStore({
		bucket: requiredEnv("TEKMEMO_S3_BUCKET"),
		publicBaseUrl: process.env.TEKMEMO_S3_PUBLIC_BASE_URL,
		clientConfig: {
			region: process.env.TEKMEMO_S3_REGION ?? "auto",
			endpoint: process.env.TEKMEMO_S3_ENDPOINT,
			forcePathStyle: process.env.TEKMEMO_S3_FORCE_PATH_STYLE === "true",
			credentials: {
				accessKeyId: requiredEnv("TEKMEMO_S3_ACCESS_KEY_ID"),
				secretAccessKey: requiredEnv("TEKMEMO_S3_SECRET_ACCESS_KEY"),
			},
		},
	});
}

function parseObjectStore(value: string | undefined): "none" | "local" | "s3" {
	const normalized = value ?? "s3";
	if (["none", "local", "s3"].includes(normalized)) {
		return normalized as "none" | "local" | "s3";
	}
	throw new Error("TEKMEMO_OBJECT_STORE must be one of: none, local, s3.");
}

function parseQueue(value: string | undefined): "none" | "postgres" {
	const normalized = value ?? "postgres";
	if (["none", "postgres"].includes(normalized)) {
		return normalized as "none" | "postgres";
	}
	throw new Error("TEKMEMO_QUEUE must be one of: none, postgres.");
}

function requiredEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is required.`);
	return value;
}
