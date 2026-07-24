/**
 * MSW server placeholder — real implementation in ticket 64.
 * This file exists so imports resolve; currently exports empty handlers.
 */

export const mswServer = {
	listen: () => {},
	close: () => {},
	resetHandlers: () => {},
};

export const restHandlers: unknown[] = [];
