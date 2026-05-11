export interface JobQueueEnqueueOptions {
	runAfter?: Date;
	maxAttempts?: number;
}

export interface JobQueueJob<TPayload = unknown> {
	id: string;
	name: string;
	payload: TPayload;
	attempts: number;
	maxAttempts: number;
}

export type JobQueueHandler<TPayload = unknown> = (
	job: JobQueueJob<TPayload>,
) => Promise<void>;

export interface JobQueue {
	readonly kind: string;
	isReady(): Promise<boolean>;
	enqueue<TPayload>(
		name: string,
		payload: TPayload,
		options?: JobQueueEnqueueOptions,
	): Promise<{ id: string }>;
	process<TPayload>(
		name: string,
		handler: JobQueueHandler<TPayload>,
		options?: { signal?: AbortSignal },
	): Promise<void>;
}

export class InlineJobQueue implements JobQueue {
	readonly kind = "inline";

	async isReady() {
		return true;
	}

	async enqueue<TPayload>(name: string, _payload: TPayload) {
		return {
			id: `${name}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
		};
	}

	async process<TPayload>(
		_name: string,
		_handler: JobQueueHandler<TPayload>,
		_options?: { signal?: AbortSignal },
	) {
		return;
	}
}
