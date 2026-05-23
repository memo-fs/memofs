import type {
	CreateCloudRuntimeOptions,
	CreateHybridRuntimeOptions,
	TekMemoRuntime,
} from "./types.js";

type AnyRuntimeMethod = (...args: unknown[]) => Promise<unknown>;

export function createCloudTekMemoRuntime(
	options: CreateCloudRuntimeOptions,
): TekMemoRuntime {
	const { client, projectId } = options;
	return {
		readCoreMemory(signal) {
			return client.memory.readCore({ projectId }, signal);
		},
		updateCoreMemory(input, signal) {
			return client.memory.updateCore(
				{ projectId, content: input.content },
				signal,
			);
		},
		listNotes(input = {}, signal) {
			return client.memory.listNotes({ ...input, projectId }, signal);
		},
		createNote(input, signal) {
			return client.memory.createNote({ ...input, projectId }, signal);
		},
		recall(input, signal) {
			return client.recall.query({ ...input, projectId }, signal);
		},
		index(input = {}, signal) {
			return client.recall.index({ ...input, projectId }, signal);
		},
		syncPush(input, signal) {
			return client.sync.push({ ...input, projectId }, signal);
		},
		syncPull(input, signal) {
			return client.sync.pull({ ...input, projectId }, signal);
		},
		syncStatus(input = {}, signal) {
			return client.sync.status({ ...input, projectId }, signal);
		},
	};
}

export function createHybridTekMemoRuntime(
	options: CreateHybridRuntimeOptions,
): TekMemoRuntime {
	const readPolicy = options.readPolicy ?? "local-first";
	const writePolicy = options.writePolicy ?? "local-first";
	const warn = options.onWarning ?? (() => undefined);

	return {
		readCoreMemory(signal) {
			return readOperation(
				readPolicy,
				options.local,
				options.cloud,
				"readCoreMemory",
				[],
				signal,
				warn,
			) as ReturnType<TekMemoRuntime["readCoreMemory"]>;
		},
		updateCoreMemory(input, signal) {
			return writeOperation(
				writePolicy,
				options.local,
				options.cloud,
				"updateCoreMemory",
				[input],
				signal,
				warn,
			) as ReturnType<TekMemoRuntime["updateCoreMemory"]>;
		},
		listNotes(input = {}, signal) {
			return readOperation(
				readPolicy,
				options.local,
				options.cloud,
				"listNotes",
				[input],
				signal,
				warn,
			) as ReturnType<TekMemoRuntime["listNotes"]>;
		},
		createNote(input, signal) {
			return writeOperation(
				writePolicy,
				options.local,
				options.cloud,
				"createNote",
				[input],
				signal,
				warn,
			) as ReturnType<TekMemoRuntime["createNote"]>;
		},
		recall(input, signal) {
			return readOperation(
				readPolicy,
				options.local,
				options.cloud,
				"recall",
				[input],
				signal,
				warn,
			) as ReturnType<TekMemoRuntime["recall"]>;
		},
		index(input = {}, signal) {
			return optionalOperation(
				writePolicy,
				options.local,
				options.cloud,
				"index",
				[input],
				signal,
				warn,
				"index",
			) as NonNullable<TekMemoRuntime["index"]> extends (
				...args: unknown[]
			) => Promise<infer R>
				? Promise<R>
				: never;
		},
		syncPush(input, signal) {
			return optionalOperation(
				writePolicy,
				options.local,
				options.cloud,
				"syncPush",
				[input],
				signal,
				warn,
				"syncPush",
			) as NonNullable<TekMemoRuntime["syncPush"]> extends (
				...args: unknown[]
			) => Promise<infer R>
				? Promise<R>
				: never;
		},
		syncPull(input, signal) {
			return optionalOperation(
				readPolicy,
				options.local,
				options.cloud,
				"syncPull",
				[input],
				signal,
				warn,
				"syncPull",
			) as NonNullable<TekMemoRuntime["syncPull"]> extends (
				...args: unknown[]
			) => Promise<infer R>
				? Promise<R>
				: never;
		},
		syncStatus(input = {}, signal) {
			return optionalOperation(
				readPolicy,
				options.local,
				options.cloud,
				"syncStatus",
				[input],
				signal,
				warn,
				"syncStatus",
			) as NonNullable<TekMemoRuntime["syncStatus"]> extends (
				...args: unknown[]
			) => Promise<infer R>
				? Promise<R>
				: never;
		},
	};
}

async function readOperation(
	policy: string,
	local: TekMemoRuntime,
	cloud: TekMemoRuntime,
	method: keyof TekMemoRuntime,
	args: unknown[],
	signal: AbortSignal | undefined,
	warn: (warning: string) => void,
): Promise<unknown> {
	if (policy === "local-only") return call(local, method, args, signal);
	if (policy === "cloud-only") return call(cloud, method, args, signal);
	const first = policy === "cloud-first" ? cloud : local;
	const second = policy === "cloud-first" ? local : cloud;
	try {
		return await call(first, method, args, signal);
	} catch (error) {
		warn(
			`Hybrid ${String(method)} primary read failed; using fallback: ${formatError(error)}`,
		);
		return call(second, method, args, signal);
	}
}

async function writeOperation(
	policy: string,
	local: TekMemoRuntime,
	cloud: TekMemoRuntime,
	method: keyof TekMemoRuntime,
	args: unknown[],
	signal: AbortSignal | undefined,
	warn: (warning: string) => void,
): Promise<unknown> {
	if (policy === "local-only") return call(local, method, args, signal);
	if (policy === "cloud-only") return call(cloud, method, args, signal);
	const primary = policy === "cloud-first" ? cloud : local;
	const secondary = policy === "cloud-first" ? local : cloud;
	const result = await call(primary, method, args, signal);
	try {
		await call(secondary, method, args, signal);
	} catch (error) {
		warn(
			`Hybrid ${String(method)} secondary write failed: ${formatError(error)}`,
		);
	}
	return result;
}

async function optionalOperation(
	policy: string,
	local: TekMemoRuntime,
	cloud: TekMemoRuntime,
	method: keyof TekMemoRuntime,
	args: unknown[],
	signal: AbortSignal | undefined,
	warn: (warning: string) => void,
	label: string,
): Promise<unknown> {
	const localMethod = local[method] as AnyRuntimeMethod | undefined;
	const cloudMethod = cloud[method] as AnyRuntimeMethod | undefined;
	const first =
		policy === "cloud-first" || policy === "cloud-only"
			? cloudMethod
			: localMethod;
	const second =
		policy === "cloud-first" || policy === "cloud-only"
			? localMethod
			: cloudMethod;

	if (policy.endsWith("only")) {
		if (!first)
			throw new Error(
				`Hybrid runtime ${label} is not available for ${policy}.`,
			);
		return invokeMethod(first, args, signal);
	}

	if (first) {
		try {
			return await invokeMethod(first, args, signal);
		} catch (error) {
			warn(`Hybrid ${label} primary operation failed: ${formatError(error)}`);
		}
	}
	if (!second) throw new Error(`Hybrid runtime ${label} is not available.`);
	return invokeMethod(second, args, signal);
}

function call(
	runtime: TekMemoRuntime,
	method: keyof TekMemoRuntime,
	args: unknown[],
	signal: AbortSignal | undefined,
): Promise<unknown> {
	const fn = runtime[method];
	if (typeof fn !== "function")
		throw new Error(`Runtime method ${String(method)} is not available.`);
	return (fn as AnyRuntimeMethod)(...args, signal);
}

function invokeMethod(
	method: AnyRuntimeMethod,
	args: unknown[],
	signal: AbortSignal | undefined,
): Promise<unknown> {
	return method(...args, signal);
}

function formatError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}
