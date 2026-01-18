import { runBdJson, runBd } from "../commands/runner.js";
import type {
	Bead,
	BeadFilters,
	ActionResult,
	BeadDetail,
	DependencyInfo,
	Comment,
} from "../types/gasown.js";

export async function listBeads(
	filters: BeadFilters = {},
	townRoot?: string,
): Promise<Bead[]> {
	const args = ["list"];

	if (filters.status) {
		args.push(`--status=${filters.status}`);
	}
	if (filters.type) {
		args.push(`--type=${filters.type}`);
	}
	if (filters.assignee) {
		args.push(`--assignee=${filters.assignee}`);
	}
	if (filters.parent) {
		args.push(`--parent=${filters.parent}`);
	}
	if (filters.limit) {
		args.push(`--limit=${filters.limit}`);
	}

	return runBdJson<Bead[]>(args, { cwd: townRoot });
}

export async function getReadyBeads(townRoot?: string): Promise<Bead[]> {
	return runBdJson<Bead[]>(["ready"], { cwd: townRoot });
}

export async function getBlockedBeads(townRoot?: string): Promise<Bead[]> {
	return runBdJson<Bead[]>(["blocked"], { cwd: townRoot });
}

export async function getBead(
	beadId: string,
	townRoot?: string,
): Promise<Bead> {
	const beads = await runBdJson<Bead[]>(["show", beadId], { cwd: townRoot });
	if (!beads || beads.length === 0) {
		throw new Error(`Bead not found: ${beadId}`);
	}
	return beads[0];
}

export async function createBead(
	title: string,
	options: {
		description?: string;
		type?: string;
		priority?: number;
		parent?: string;
	} = {},
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["create", `--title=${title}`];

	if (options.description) {
		args.push(`--description=${options.description}`);
	}
	if (options.type) {
		args.push(`--type=${options.type}`);
	}
	if (options.priority !== undefined) {
		args.push(`--priority=${options.priority}`);
	}
	if (options.parent) {
		args.push(`--parent=${options.parent}`);
	}

	const result = await runBd([...args, "--json"], { cwd: townRoot });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to create bead",
			error: result.stderr,
		};
	}

	try {
		const created = JSON.parse(result.stdout) as Bead;
		return {
			success: true,
			message: `Created bead: ${created.id}`,
			data: created,
		};
	} catch {
		return {
			success: true,
			message: "Bead created",
		};
	}
}

export async function updateBeadStatus(
	beadId: string,
	status: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["update", beadId, `--status=${status}`], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to update bead status",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Updated ${beadId} status to ${status}`,
	};
}

export async function closeBead(
	beadId: string,
	reason?: string,
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["close", beadId];
	if (reason) {
		args.push("--reason", reason);
	}

	const result = await runBd(args, { cwd: townRoot });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to close bead",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Closed bead: ${beadId}`,
	};
}

export async function listRigBeads(
	rigName: string,
	filters: BeadFilters = {},
	townRoot?: string,
): Promise<Bead[]> {
	const path = await import("path");
	const rigPath = path.join(
		townRoot || process.env.GT_TOWN_ROOT || `${process.env.HOME}/gt`,
		rigName,
	);
	return listBeads(filters, rigPath);
}

export async function getReadyRigBeads(
	rigName: string,
	townRoot?: string,
): Promise<Bead[]> {
	const path = await import("path");
	const rigPath = path.join(
		townRoot || process.env.GT_TOWN_ROOT || `${process.env.HOME}/gt`,
		rigName,
	);
	return runBdJson<Bead[]>(["ready"], { cwd: rigPath });
}

export async function getAllRigBeads(
	rigNames: string[],
	filters: BeadFilters = {},
	townRoot?: string,
): Promise<Record<string, Bead[]>> {
	const results: Record<string, Bead[]> = {};

	await Promise.all(
		rigNames.map(async (rigName) => {
			try {
				results[rigName] = await listRigBeads(rigName, filters, townRoot);
			} catch {
				results[rigName] = [];
			}
		}),
	);

	return results;
}

// =====================
// Dependencies
// =====================

export interface BeadDependency {
	id: string;
	title: string;
	status: string;
	type: string;
	priority: number;
}

export async function getBeadDependencies(
	beadId: string,
	townRoot?: string,
): Promise<{ blocks: BeadDependency[]; blocked_by: BeadDependency[] }> {
	// Get dependencies (issues this bead depends on)
	const blocked_by = await runBdJson<BeadDependency[]>(
		["dep", "list", beadId, "--depends-on"],
		{ cwd: townRoot },
	);

	// Get issues this bead blocks
	const blocks = await runBdJson<BeadDependency[]>(
		["dep", "list", beadId, "--blocks"],
		{ cwd: townRoot },
	);

	return { blocks, blocked_by };
}

export async function addBeadDependency(
	beadId: string,
	dependsOn: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["dep", "add", beadId, dependsOn], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to add dependency",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Added dependency: ${beadId} depends on ${dependsOn}`,
	};
}

export async function removeBeadDependency(
	beadId: string,
	dependsOn: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["dep", "remove", beadId, dependsOn], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to remove dependency",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Removed dependency: ${beadId} no longer depends on ${dependsOn}`,
	};
}

// =====================
// Comments
// =====================

export interface BeadComment {
	id: string;
	author: string;
	body: string;
	created_at: string;
}

export async function getBeadComments(
	beadId: string,
	townRoot?: string,
): Promise<BeadComment[]> {
	return runBdJson<BeadComment[]>(["comments", beadId], { cwd: townRoot });
}

export async function addBeadComment(
	beadId: string,
	comment: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runBd(["comments", "add", beadId, comment], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to add comment",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: "Comment added",
	};
}

// =====================
// Enhanced Bead Detail
// =====================

/**
 * Get full bead detail with dependencies and comments
 */
export async function getBeadDetail(
	beadId: string,
	townRoot?: string,
): Promise<BeadDetail> {
	// Get basic bead info
	const bead = await getBead(beadId, townRoot);

	// Get dependencies
	const deps = await getBeadDependencies(beadId, townRoot);

	// Get comments
	const comments = await getBeadComments(beadId, townRoot);

	// Convert BeadDependency to DependencyInfo format
	const blocks: DependencyInfo[] = deps.blocks.map((dep) => ({
		...dep,
		direction: "blocks" as const,
	}));

	const blocked_by: DependencyInfo[] = deps.blocked_by.map((dep) => ({
		...dep,
		direction: "blocked_by" as const,
	}));

	// Convert BeadComment to Comment format
	const formattedComments: Comment[] = comments.map((c) => ({
		id: c.id,
		author: c.author,
		content: c.body,
		created_at: c.created_at,
	}));

	return {
		...bead,
		blocks,
		blocked_by,
		comments: formattedComments,
	};
}

/**
 * Update bead fields (status, priority, assignee, etc.)
 */
export async function updateBead(
	beadId: string,
	updates: {
		status?: string;
		priority?: number;
		assignee?: string;
		title?: string;
		description?: string;
	},
	townRoot?: string,
): Promise<ActionResult> {
	const args = ["update", beadId];

	if (updates.status) {
		args.push(`--status=${updates.status}`);
	}
	if (updates.priority !== undefined) {
		args.push(`--priority=${updates.priority}`);
	}
	if (updates.assignee) {
		args.push(`--assignee=${updates.assignee}`);
	}
	if (updates.title) {
		args.push(`--title=${updates.title}`);
	}
	if (updates.description) {
		args.push(`--description=${updates.description}`);
	}

	const result = await runBd(args, { cwd: townRoot });

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to update bead",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Updated bead: ${beadId}`,
	};
}

/**
 * Assign a bead to a user/agent
 */
export async function assignBead(
	beadId: string,
	assignee: string,
	townRoot?: string,
): Promise<ActionResult> {
	return updateBead(beadId, { assignee }, townRoot);
}
