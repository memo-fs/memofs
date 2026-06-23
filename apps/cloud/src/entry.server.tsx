/**
 * Server entry — required because we run on Cloudflare Workers via
 * `@react-router/cloudflare`, not `@react-router/node`. React Router's
 * typegen/build only auto-derives the server entry from `@react-router/node`;
 * any other runtime needs this explicit file.
 *
 * Worker-safe: uses `renderToReadableStream` (web-standard, no `node:stream`,
 * no `PassThrough`, no `createReadableStreamFromReadable`). The `isbot`
 * package is imported directly — react-router v8 does not re-export it.
 *
 * Note: React Router v8's `ServerRouter` no longer takes an `abortDelay`
 * prop; abort is driven by the request `signal` passed to
 * `renderToReadableStream`.
 */

import { isbot } from "isbot";
import { renderToReadableStream } from "react-dom/server";
import type { EntryContext } from "react-router";
import { ServerRouter } from "react-router";

export default function handleRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
) {
	if (routerContext.isSpaMode) {
		responseHeaders.set("content-type", "text/html");
	}

	const userAgent = request.headers.get("user-agent") ?? "";
	return isbot(userAgent)
		? handleBotRequest(
				request,
				responseStatusCode,
				responseHeaders,
				routerContext,
			)
		: handleBrowserRequest(
				request,
				responseStatusCode,
				responseHeaders,
				routerContext,
			);
}

async function handleBotRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
): Promise<Response> {
	// Bots get the full document pre-rendered before anything is sent — better
	// for crawlers that don't execute streaming chunks. `allReady` resolves once
	// the entire tree has rendered (or rejects on error).
	let status = responseStatusCode;
	const stream = await renderToReadableStream(
		<ServerRouter context={routerContext} url={request.url} />,
		{
			signal: request.signal,
			onError(error: unknown) {
				status = 500;
				console.error(error);
			},
		},
	);
	await stream.allReady;
	responseHeaders.set("content-type", "text/html");
	return new Response(stream, { headers: responseHeaders, status });
}

async function handleBrowserRequest(
	request: Request,
	responseStatusCode: number,
	responseHeaders: Headers,
	routerContext: EntryContext,
): Promise<Response> {
	// Browsers receive the shell as a stream and hydrate as bytes arrive.
	let status = responseStatusCode;
	const stream = await renderToReadableStream(
		<ServerRouter context={routerContext} url={request.url} />,
		{
			signal: request.signal,
			onError(error: unknown) {
				status = 500;
				console.error(error);
			},
		},
	);
	responseHeaders.set("content-type", "text/html");
	return new Response(stream, { headers: responseHeaders, status });
}
