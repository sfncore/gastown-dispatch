/**
 * Merge Queue (MQ) caching service with staggered polling.
 *
 * Caching strategy:
 * - Per-rig MQ data: 5-10s TTL with staggered polling
 * - Stagger prevents thundering herd when multiple rigs are active
 *
 * Supports graceful degradation - serves stale data when gt commands fail.
 */

import { runGtJson } from "../commands/runner.js";
import { StaggeredPoller, Cache } from "./cache.js";
import type { MQSummary, TownStatus } from "../types/gasown.js";

// TTL constants (in milliseconds)
const MQ_TTL = 7_000; // 7 seconds (within 5-10s range)
const MQ_STAGGER_MS = 2_000; // Poll one rig every 2 seconds
const MAX_STALE_AGE = 60_000; // Serve stale data up to 1 minute during outages

export interface MQStatus {
	rig: string;
	mq: MQSummary;
	timestamp: number;
}

export interface MQServiceResponse {
	data: Map<string, MQStatus>;
	degraded: string[];
	error?: string;
}

// Singleton staggered poller for MQ data
let mqPoller: StaggeredPoller<string, MQSummary> | null = null;
let townRoot: string | undefined;

// Cache for full status (used to get rig list)
let statusCache: Cache<TownStatus> | null = null;

/**
 * Fetch MQ summary for a specific rig.
 */
async function fetchRigMQ(rigName: string): Promise<MQSummary> {
	try {
		// gt status provides MQ info per rig
		const status = await runGtJson<TownStatus>(["status"], {
			cwd: townRoot,
			timeout: 15_000,
		});

		const rig = status.rigs?.find((r) => r.name === rigName);
		if (!rig?.mq) {
			// Return idle state if no MQ info
			return {
				pending: 0,
				in_flight: 0,
				blocked: 0,
				state: "idle",
				health: "empty",
			};
		}

		return rig.mq;
	} catch (err) {
		throw new Error(
			`Failed to fetch MQ for ${rigName}: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

/**
 * Initialize the MQ poller with known rigs.
 */
function initPoller(root?: string): StaggeredPoller<string, MQSummary> {
	townRoot = root;

	if (!mqPoller) {
		mqPoller = new StaggeredPoller<string, MQSummary>(
			(rigName) => () => fetchRigMQ(rigName),
			{
				ttl: MQ_TTL,
				staleWhileRevalidate: true,
				maxStaleAge: MAX_STALE_AGE,
				staggerMs: MQ_STAGGER_MS,
			},
		);
	}

	return mqPoller;
}

/**
 * Get MQ status for all known rigs.
 * Starts polling if not already running.
 */
export async function getAllMQStatus(
	root?: string,
): Promise<MQServiceResponse> {
	const poller = initPoller(root);

	// Get current rig list from status
	try {
		if (!statusCache) {
			statusCache = new Cache<TownStatus>(
				() =>
					runGtJson<TownStatus>(["status"], {
						cwd: root,
						timeout: 30_000,
					}),
				{
					ttl: 5_000, // 5s cache for rig list
					staleWhileRevalidate: true,
					maxStaleAge: MAX_STALE_AGE,
				},
			);
		}

		const status = await statusCache.get();

		// Add any new rigs to the poller
		for (const rig of status.rigs || []) {
			poller.addResource(rig.name);
		}

		// Start polling if not already
		poller.startPolling();
	} catch (err) {
		// Continue with existing rigs if status fetch fails
	}

	// Collect MQ data from all rigs
	const result = new Map<string, MQStatus>();
	const cachedData = poller.getAllCached();
	const now = Date.now();

	for (const [rigName, mq] of cachedData) {
		if (mq) {
			result.set(rigName, {
				rig: rigName,
				mq,
				timestamp: now,
			});
		}
	}

	return {
		data: result,
		degraded: poller.getDegradedResources(),
	};
}

/**
 * Get MQ status for a specific rig.
 */
export async function getRigMQStatus(
	rigName: string,
	root?: string,
): Promise<MQSummary> {
	const poller = initPoller(root);
	return poller.get(rigName);
}

/**
 * Start background MQ polling for all rigs.
 * Call this when dashboard clients connect.
 */
export function startMQPolling(root?: string): void {
	const poller = initPoller(root);
	poller.startPolling();
}

/**
 * Stop background MQ polling.
 * Call this when all dashboard clients disconnect.
 */
export function stopMQPolling(): void {
	if (mqPoller) {
		mqPoller.stopPolling();
	}
}

/**
 * Check if MQ system is in degraded mode (any rig failing).
 */
export function isMQDegraded(): boolean {
	if (!mqPoller) return false;
	return mqPoller.getDegradedResources().length > 0;
}

/**
 * Get aggregate MQ summary across all rigs.
 */
export async function getAggregateMQSummary(
	root?: string,
): Promise<{
	total_pending: number;
	total_in_flight: number;
	total_blocked: number;
	state: "idle" | "processing" | "blocked";
	health: "healthy" | "degraded" | "offline";
	rigs_reporting: number;
	rigs_degraded: number;
}> {
	const response = await getAllMQStatus(root);

	let totalPending = 0;
	let totalInFlight = 0;
	let totalBlocked = 0;
	let hasBlocked = false;
	let hasProcessing = false;

	for (const [_, mqStatus] of response.data) {
		totalPending += mqStatus.mq.pending;
		totalInFlight += mqStatus.mq.in_flight;
		totalBlocked += mqStatus.mq.blocked;

		if (mqStatus.mq.state === "blocked") hasBlocked = true;
		if (mqStatus.mq.state === "processing") hasProcessing = true;
	}

	const state = hasBlocked ? "blocked" : hasProcessing ? "processing" : "idle";
	const health =
		response.degraded.length === response.data.size
			? "offline"
			: response.degraded.length > 0
				? "degraded"
				: "healthy";

	return {
		total_pending: totalPending,
		total_in_flight: totalInFlight,
		total_blocked: totalBlocked,
		state,
		health,
		rigs_reporting: response.data.size,
		rigs_degraded: response.degraded.length,
	};
}
