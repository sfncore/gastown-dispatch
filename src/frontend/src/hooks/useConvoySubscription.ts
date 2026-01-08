import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface ConvoyEvent {
	type:
		| "convoy:created"
		| "convoy:updated"
		| "convoy:closed"
		| "issue:status"
		| "worker:assigned";
	data: Record<string, unknown>;
}

interface UseConvoySubscriptionOptions {
	enabled?: boolean;
	onEvent?: (event: ConvoyEvent) => void;
}

export function useConvoySubscription(
	options: UseConvoySubscriptionOptions = {},
) {
	const { enabled = true, onEvent } = options;
	const queryClient = useQueryClient();
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
		null,
	);

	const invalidateConvoys = useCallback(() => {
		queryClient.invalidateQueries({ queryKey: ["convoys"] });
	}, [queryClient]);

	const invalidateConvoyDetail = useCallback(
		(convoyId: string) => {
			queryClient.invalidateQueries({ queryKey: ["convoy-detail", convoyId] });
			queryClient.invalidateQueries({
				queryKey: ["synthesis-status", convoyId],
			});
		},
		[queryClient],
	);

	useEffect(() => {
		if (!enabled) return;

		const connect = () => {
			const eventSource = new EventSource("/api/stream/convoys");
			eventSourceRef.current = eventSource;

			eventSource.addEventListener("connected", () => {
				console.log("[ConvoySSE] Connected");
			});

			eventSource.addEventListener("convoy:created", (e) => {
				const data = JSON.parse(e.data);
				console.log("[ConvoySSE] Convoy created:", data.convoy_id);
				invalidateConvoys();
				onEvent?.({ type: "convoy:created", data });
			});

			eventSource.addEventListener("convoy:updated", (e) => {
				const data = JSON.parse(e.data);
				console.log("[ConvoySSE] Convoy updated:", data.convoy_id);
				invalidateConvoys();
				invalidateConvoyDetail(data.convoy_id);
				onEvent?.({ type: "convoy:updated", data });
			});

			eventSource.addEventListener("convoy:closed", (e) => {
				const data = JSON.parse(e.data);
				console.log("[ConvoySSE] Convoy closed:", data.convoy_id);
				invalidateConvoys();
				invalidateConvoyDetail(data.convoy_id);
				onEvent?.({ type: "convoy:closed", data });
			});

			eventSource.addEventListener("issue:status", (e) => {
				const data = JSON.parse(e.data);
				console.log("[ConvoySSE] Issue status changed:", data.issue_id);
				invalidateConvoyDetail(data.convoy_id);
				onEvent?.({ type: "issue:status", data });
			});

			eventSource.addEventListener("worker:assigned", (e) => {
				const data = JSON.parse(e.data);
				console.log("[ConvoySSE] Worker assigned:", data.worker);
				invalidateConvoyDetail(data.convoy_id);
				onEvent?.({ type: "worker:assigned", data });
			});

			eventSource.onerror = () => {
				console.warn("[ConvoySSE] Connection error, reconnecting...");
				eventSource.close();
				eventSourceRef.current = null;

				// Reconnect after 3 seconds
				reconnectTimeoutRef.current = setTimeout(() => {
					connect();
				}, 3000);
			};
		};

		connect();

		return () => {
			if (reconnectTimeoutRef.current) {
				clearTimeout(reconnectTimeoutRef.current);
			}
			if (eventSourceRef.current) {
				eventSourceRef.current.close();
				eventSourceRef.current = null;
			}
		};
	}, [enabled, invalidateConvoys, invalidateConvoyDetail, onEvent]);

	return {
		connected: eventSourceRef.current?.readyState === EventSource.OPEN,
	};
}
