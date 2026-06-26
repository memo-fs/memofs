export type FetcherResult =
	| { ok: true; email: string }
	| { ok: false; error: string };
