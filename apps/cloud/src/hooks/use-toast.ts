/**
 * @fileoverview Toast Notification Hook
 *
 * React hook for displaying toast notifications from server-sent toast data.
 * Uses sonner for the underlying toast implementation.
 *
 * @module hooks/use-toast
 */

import type { Toast } from "@repo/utils/toast";
import React from "react";
import { toast } from "sonner";

/**
 * Hook to display a toast notification from server-sent data.
 *
 * This hook bridges server-to-client toast notifications. The server
 * creates a Toast object which is serialized and sent to the client,
 * where this hook displays it using sonner.
 *
 * @param toastSession - Optional toast data from the server, typically from loader/action data
 *
 * @example
 * ```tsx
 * // In a route component
 * function MyComponent() {
 *   const toastSession = useRouteLoaderData<typeof loader>("root")?.toast
 *   useToast(toastSession)
 *
 *   // ... rest of component
 * }
 * ```
 *
 * @example
 * ```ts
 * // In a server loader/action
 * export async function action({ request }: Route.ActionArgs) {
 *   await doSomething()
 *   return { toast: { type: "success" as const, title: "Saved!", id: "123" } }
 * }
 * ```
 */
export function useToast(toastSession?: Toast | null) {
	React.useEffect(() => {
		if (toastSession) {
			window.setTimeout(() => {
				toast[toastSession.type](toastSession.title, {
					id: toastSession.id,
					description: toastSession.description,
				});
			}, 0);
		}
	}, [toastSession]);
}
