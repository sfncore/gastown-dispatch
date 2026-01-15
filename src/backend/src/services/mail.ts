/**
 * Mail inbox service with tiered caching.
 *
 * Caching strategy:
 * - Unread count: 3s TTL (fast poll for badge updates)
 * - Full inbox: 10-15s TTL (slower poll for message list)
 *
 * Supports graceful degradation - serves stale data when gt commands fail.
 */

import { runGt } from "../commands/runner.js";
import { TieredCache } from "./cache.js";

// TTL constants (in milliseconds)
const UNREAD_TTL = 3_000; // 3 seconds for unread count
const FULL_INBOX_TTL = 12_000; // 12 seconds for full inbox (within 10-15s range)
const MAX_STALE_AGE = 60_000; // Serve stale data up to 1 minute during outages

export interface MailMessage {
	id: string;
	from: string;
	to: string;
	subject: string;
	body?: string;
	timestamp: string;
	read: boolean;
	thread_id?: string;
}

export interface UnreadCount {
	count: number;
	first_subject?: string;
}

export interface MailInbox {
	messages: MailMessage[];
	unread_count: number;
	total_count: number;
}

export interface MailServiceResponse<T> {
	data: T;
	stale: boolean;
	error?: string;
}

// Per-agent mail caches (key: agent address or "__global__" for overseer)
const agentMailCaches = new Map<string, TieredCache<UnreadCount, MailInbox>>();

/**
 * Parse gt mail inbox text output into structured data.
 * Falls back to JSON if available.
 */
function parseMailInbox(output: string): MailInbox {
	// Try JSON first
	try {
		const json = JSON.parse(output);
		if (Array.isArray(json)) {
			return {
				messages: json,
				unread_count: json.filter((m: MailMessage) => !m.read).length,
				total_count: json.length,
			};
		}
		return json as MailInbox;
	} catch {
		// Parse text output
	}

	const messages: MailMessage[] = [];
	const lines = output.trim().split("\n").filter(Boolean);

	// Parse each mail entry
	// Format: "● [unread] From: agent Subject: msg" or similar
	for (const line of lines) {
		const unread = line.includes("●") || line.toLowerCase().includes("unread");
		const fromMatch = line.match(/From:\s*(\S+)/i);
		const subjectMatch = line.match(/Subject:\s*(.+?)(?:\s*$|\s*\|)/i);
		const idMatch = line.match(/\[([^\]]+)\]/);

		if (fromMatch || subjectMatch) {
			messages.push({
				id: idMatch?.[1] || `msg-${messages.length}`,
				from: fromMatch?.[1] || "unknown",
				to: "me",
				subject: subjectMatch?.[1]?.trim() || "(no subject)",
				timestamp: new Date().toISOString(),
				read: !unread,
			});
		}
	}

	return {
		messages,
		unread_count: messages.filter((m) => !m.read).length,
		total_count: messages.length,
	};
}

/**
 * Parse unread count from gt mail inbox or status output.
 */
function parseUnreadCount(output: string): UnreadCount {
	// Try to extract count from various formats
	const countMatch = output.match(/(\d+)\s*unread/i);
	const count = countMatch ? parseInt(countMatch[1], 10) : 0;

	// Try to get first subject
	const subjectMatch = output.match(/Subject:\s*(.+?)(?:\s*$|\s*\|)/i);

	return {
		count,
		first_subject: subjectMatch?.[1]?.trim(),
	};
}

/**
 * Fetch unread count (fast operation).
 */
async function fetchUnreadCount(
	agent?: string,
	townRoot?: string,
): Promise<UnreadCount> {
	const args = agent
		? ["mail", "inbox", "--agent", agent, "--count"]
		: ["mail", "inbox", "--count"];

	try {
		const result = await runGt(args, { cwd: townRoot, timeout: 5_000 });
		if (result.exitCode !== 0) {
			// Try to parse count from status instead
			const statusArgs = agent
				? ["status", "--agent", agent]
				: ["status"];
			const statusResult = await runGt(statusArgs, { cwd: townRoot, timeout: 10_000 });
			return parseUnreadCount(statusResult.stdout);
		}
		return parseUnreadCount(result.stdout);
	} catch (err) {
		throw new Error(
			`Failed to fetch unread count: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

/**
 * Fetch full inbox (slower operation).
 */
async function fetchFullInbox(
	agent?: string,
	townRoot?: string,
): Promise<MailInbox> {
	const args = agent
		? ["mail", "inbox", "--agent", agent]
		: ["mail", "inbox"];

	try {
		// Try JSON output first
		const result = await runGt([...args, "--json"], {
			cwd: townRoot,
			timeout: 15_000,
		});

		if (result.exitCode === 0) {
			return parseMailInbox(result.stdout);
		}

		// Fall back to text parsing
		const textResult = await runGt(args, { cwd: townRoot, timeout: 15_000 });
		return parseMailInbox(textResult.stdout);
	} catch (err) {
		throw new Error(
			`Failed to fetch inbox: ${err instanceof Error ? err.message : String(err)}`,
		);
	}
}

/**
 * Get or create tiered cache for an agent.
 */
function getAgentCache(
	agent: string,
	townRoot?: string,
): TieredCache<UnreadCount, MailInbox> {
	const cacheKey = agent || "__global__";

	let cache = agentMailCaches.get(cacheKey);
	if (!cache) {
		cache = new TieredCache<UnreadCount, MailInbox>(
			() => fetchUnreadCount(agent || undefined, townRoot),
			() => fetchFullInbox(agent || undefined, townRoot),
			{
				ttl: UNREAD_TTL,
				staleWhileRevalidate: true,
				maxStaleAge: MAX_STALE_AGE,
			},
			{
				ttl: FULL_INBOX_TTL,
				staleWhileRevalidate: true,
				maxStaleAge: MAX_STALE_AGE,
			},
		);
		agentMailCaches.set(cacheKey, cache);
	}

	return cache;
}

/**
 * Get unread mail count for an agent (or global inbox).
 * Uses 3s cache TTL.
 */
export async function getUnreadCount(
	agent?: string,
	townRoot?: string,
): Promise<MailServiceResponse<UnreadCount>> {
	const cache = getAgentCache(agent || "", townRoot);

	try {
		const data = await cache.getFast();
		const stats = cache.getStats();
		return {
			data,
			stale: stats.fast.staleHits > stats.fast.hits,
			error: stats.fast.lastError || undefined,
		};
	} catch (err) {
		// Check for stale data
		const cached = cache.getCachedFast();
		if (cached) {
			return {
				data: cached,
				stale: true,
				error: err instanceof Error ? err.message : String(err),
			};
		}

		// Return empty response on complete failure
		return {
			data: { count: 0 },
			stale: true,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

/**
 * Get full mail inbox for an agent (or global inbox).
 * Uses 10-15s cache TTL.
 */
export async function getMailInbox(
	agent?: string,
	townRoot?: string,
): Promise<MailServiceResponse<MailInbox>> {
	const cache = getAgentCache(agent || "", townRoot);

	try {
		const data = await cache.getFull();
		const stats = cache.getStats();
		return {
			data,
			stale: stats.full.staleHits > stats.full.hits,
			error: stats.full.lastError || undefined,
		};
	} catch (err) {
		// Check for stale data
		const cached = cache.getCachedFull();
		if (cached) {
			return {
				data: cached,
				stale: true,
				error: err instanceof Error ? err.message : String(err),
			};
		}

		// Return empty response on complete failure
		return {
			data: { messages: [], unread_count: 0, total_count: 0 },
			stale: true,
			error: err instanceof Error ? err.message : String(err),
		};
	}
}

/**
 * Invalidate mail cache for an agent (e.g., after sending/reading mail).
 */
export function invalidateMailCache(agent?: string): void {
	const cacheKey = agent || "__global__";
	const cache = agentMailCaches.get(cacheKey);
	if (cache) {
		cache.invalidateAll();
	}
}

/**
 * Get cache statistics for monitoring.
 */
export function getMailCacheStats(): Map<
	string,
	{ fast: { hits: number; misses: number; errors: number }; full: { hits: number; misses: number; errors: number } }
> {
	const stats = new Map();
	for (const [key, cache] of agentMailCaches) {
		stats.set(key, cache.getStats());
	}
	return stats;
}
