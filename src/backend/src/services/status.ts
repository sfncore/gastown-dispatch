import { runGtJson, runGt } from "../commands/runner.js";
import type { TownStatus } from "../types/gasown.js";

let statusCache: { data: TownStatus; timestamp: number } | null = null;
let pendingRequest: Promise<StatusResponse> | null = null;
const CACHE_TTL = 5_000; // 5 seconds

export interface StatusResponse {
	initialized: boolean;
	status?: TownStatus;
	error?: string;
}

export async function getTownStatus(
	townRoot?: string,
): Promise<StatusResponse> {
	const now = Date.now();

	// Return cached data if still valid
	if (statusCache && now - statusCache.timestamp < CACHE_TTL) {
		return { initialized: true, status: statusCache.data };
	}

	// If a request is already in progress, wait for it instead of starting a new one
	if (pendingRequest) {
		return pendingRequest;
	}

	// Start a new request and cache the promise
	pendingRequest = (async () => {
		try {
			const status = await runGtJson<TownStatus>(["status"], {
				cwd: townRoot,
				timeout: 60_000, // Increase timeout to 60s for large workspaces
			});

			statusCache = { data: status, timestamp: Date.now() };
			return { initialized: true, status };
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);

			// Check for "not in workspace" error
			if (message.includes("not in a Gas Town workspace")) {
				return {
					initialized: false,
					error:
						"Not in a Gas Town workspace. Set GT_TOWN_ROOT or navigate to a Gas Town project.",
				};
			}

			// Re-throw other errors
			throw err;
		} finally {
			// Clear pending request when done
			pendingRequest = null;
		}
	})();

	return pendingRequest;
}

export function invalidateStatusCache(): void {
	statusCache = null;
}
