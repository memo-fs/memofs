/**
 * Connector registry — maps a `ConnectorConfig.type` to a {@link Connector}
 * implementation.
 *
 * @public
 */

import { GitHubConnector } from "./connectors/github";
import { NotionConnector } from "./connectors/notion";
import type { Connector } from "./types";

/**
 * Mutable registry of connector implementations. The runner looks up a
 * connector by {@link ConnectorConfig.type} here.
 *
 * Third-party connectors register via {@link ConnectorRegistry.register} —
 * this is the Q10 extensibility point ("write a new adapter, not a refactor").
 *
 * @public
 */
export class ConnectorRegistry {
	private readonly connectors = new Map<string, Connector>();

	constructor(
		builtins: readonly Connector[] = [
			new GitHubConnector(),
			new NotionConnector(),
		],
	) {
		for (const connector of builtins) {
			this.register(connector);
		}
	}

	/** Register or replace a connector by its `type`. */
	register(connector: Connector): this {
		this.connectors.set(connector.type, connector);
		return this;
	}

	/** Look up a connector by `type`. Returns `undefined` if none registered. */
	get(type: string): Connector | undefined {
		return this.connectors.get(type);
	}

	/** Whether a connector is registered for `type`. */
	has(type: string): boolean {
		return this.connectors.has(type);
	}

	/** All registered connector types. */
	types(): readonly string[] {
		return [...this.connectors.keys()];
	}
}

/**
 * Convenience factory: a fresh registry seeded with the built-in connectors
 * (GitHub + Notion).
 *
 * @public
 */
export function createConnectorRegistry(
	extras: readonly Connector[] = [],
): ConnectorRegistry {
	return new ConnectorRegistry([
		new GitHubConnector(),
		new NotionConnector(),
		...extras,
	]);
}

/**
 * Look up a connector by `type`, throwing a clear error if unregistered.
 *
 * @internal
 */
export function getConnector(
	registry: ConnectorRegistry,
	type: string,
): Connector {
	const connector = registry.get(type);
	if (!connector) {
		throw new Error(
			`No connector registered for type "${type}". Registered: ${registry.types().join(", ") || "(none)"}.`,
		);
	}
	return connector;
}
