import { execSync, exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";

const execAsync = promisify(exec);

export interface RigInfo {
	name: string;
	enabled: boolean;
	witnessRunning: boolean;
	memoryMB: number;
	polecatCount: number;
	crewCount: number;
	beadPrefix: string;
	gitUrl: string;
}

export interface RigListResponse {
	rigs: RigInfo[];
	totalMemoryMB: number;
	activeCount: number;
}

interface RigsJson {
	version: number;
	rigs: Record<
		string,
		{
			git_url: string;
			added_at: string;
			beads: { repo: string; prefix: string };
			enabled?: boolean;
		}
	>;
}

function getTownRoot(townRoot?: string): string {
	return townRoot || process.env.GT_TOWN_ROOT || "/Users/erik/gt";
}

function getRigsJsonPath(townRoot: string): string {
	return path.join(townRoot, "mayor", "rigs.json");
}

function readRigsJson(townRoot: string): RigsJson {
	const rigsPath = getRigsJsonPath(townRoot);
	const content = fs.readFileSync(rigsPath, "utf-8");
	return JSON.parse(content);
}

function writeRigsJson(townRoot: string, data: RigsJson): void {
	const rigsPath = getRigsJsonPath(townRoot);
	fs.writeFileSync(rigsPath, JSON.stringify(data, null, 2));
}

function isWitnessRunning(rigName: string): boolean {
	try {
		const sessionName = `gt-${rigName}-witness`;
		execSync(`tmux has-session -t ${sessionName} 2>/dev/null`, {
			stdio: "pipe",
		});
		return true;
	} catch {
		return false;
	}
}

function getProcessMemoryMB(pattern: string): number {
	try {
		const result = execSync(
			`ps aux | grep -i "${pattern}" | grep -v grep | awk '{sum += $6} END {print sum/1024}'`,
			{ encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
		);
		return Math.round(parseFloat(result.trim()) || 0);
	} catch {
		return 0;
	}
}

function getPolecatCount(rigName: string, townRoot: string): number {
	try {
		const polecatsDir = path.join(townRoot, rigName, "polecats");
		if (!fs.existsSync(polecatsDir)) return 0;
		const entries = fs.readdirSync(polecatsDir);
		return entries.filter((e) =>
			fs.statSync(path.join(polecatsDir, e)).isDirectory(),
		).length;
	} catch {
		return 0;
	}
}

function getCrewCount(rigName: string, townRoot: string): number {
	try {
		const crewDir = path.join(townRoot, rigName, "crew");
		if (!fs.existsSync(crewDir)) return 0;
		const entries = fs.readdirSync(crewDir);
		return entries.filter(
			(e) =>
				!e.startsWith(".") && fs.statSync(path.join(crewDir, e)).isDirectory(),
		).length;
	} catch {
		return 0;
	}
}

export async function listRigs(townRoot?: string): Promise<RigListResponse> {
	const root = getTownRoot(townRoot);
	const rigsJson = readRigsJson(root);

	const rigs: RigInfo[] = [];
	let totalMemoryMB = 0;
	let activeCount = 0;

	for (const [name, data] of Object.entries(rigsJson.rigs)) {
		const witnessRunning = isWitnessRunning(name);
		const memoryMB = witnessRunning
			? getProcessMemoryMB(`gt-${name}-witness`)
			: 0;

		const rig: RigInfo = {
			name,
			enabled: data.enabled ?? false,
			witnessRunning,
			memoryMB,
			polecatCount: getPolecatCount(name, root),
			crewCount: getCrewCount(name, root),
			beadPrefix: data.beads?.prefix || name,
			gitUrl: data.git_url,
		};

		rigs.push(rig);
		totalMemoryMB += memoryMB;
		if (witnessRunning) activeCount++;
	}

	rigs.sort((a, b) => a.name.localeCompare(b.name));

	return { rigs, totalMemoryMB, activeCount };
}

export async function getRigStatus(
	rigName: string,
	townRoot?: string,
): Promise<RigInfo | null> {
	const root = getTownRoot(townRoot);
	const rigsJson = readRigsJson(root);
	const data = rigsJson.rigs[rigName];

	if (!data) return null;

	const witnessRunning = isWitnessRunning(rigName);

	return {
		name: rigName,
		enabled: data.enabled ?? false,
		witnessRunning,
		memoryMB: witnessRunning ? getProcessMemoryMB(`gt-${rigName}-witness`) : 0,
		polecatCount: getPolecatCount(rigName, root),
		crewCount: getCrewCount(rigName, root),
		beadPrefix: data.beads?.prefix || rigName,
		gitUrl: data.git_url,
	};
}

export async function enableRig(
	rigName: string,
	townRoot?: string,
): Promise<{ success: boolean; message: string }> {
	const root = getTownRoot(townRoot);
	const rigsJson = readRigsJson(root);

	if (!rigsJson.rigs[rigName]) {
		return { success: false, message: `Rig '${rigName}' not found` };
	}

	// Update enabled status
	rigsJson.rigs[rigName].enabled = true;
	writeRigsJson(root, rigsJson);

	// Start witness if not running
	if (!isWitnessRunning(rigName)) {
		try {
			await execAsync(`cd ${root} && gt witness start ${rigName}`, {
				timeout: 30000,
			});
		} catch (err) {
			return {
				success: true,
				message: `Enabled ${rigName} but failed to start witness: ${err}`,
			};
		}
	}

	return { success: true, message: `Enabled rig '${rigName}'` };
}

export async function disableRig(
	rigName: string,
	townRoot?: string,
): Promise<{ success: boolean; message: string }> {
	const root = getTownRoot(townRoot);
	const rigsJson = readRigsJson(root);

	if (!rigsJson.rigs[rigName]) {
		return { success: false, message: `Rig '${rigName}' not found` };
	}

	// Update enabled status
	rigsJson.rigs[rigName].enabled = false;
	writeRigsJson(root, rigsJson);

	// Stop witness if running
	if (isWitnessRunning(rigName)) {
		try {
			const sessionName = `gt-${rigName}-witness`;
			execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, {
				stdio: "pipe",
			});
		} catch {
			// Session might already be dead
		}
	}

	return { success: true, message: `Disabled rig '${rigName}'` };
}

export async function enableAllRigs(
	townRoot?: string,
): Promise<{ success: boolean; message: string; enabled: number }> {
	const root = getTownRoot(townRoot);
	const rigsJson = readRigsJson(root);
	let enabled = 0;

	for (const name of Object.keys(rigsJson.rigs)) {
		rigsJson.rigs[name].enabled = true;
		enabled++;
	}

	writeRigsJson(root, rigsJson);

	// Start town to bring up all witnesses
	try {
		await execAsync(`cd ${root} && gt up`, { timeout: 120000 });
	} catch {
		// Partial success is ok
	}

	return { success: true, message: `Enabled ${enabled} rigs`, enabled };
}

export async function disableAllRigs(
	townRoot?: string,
): Promise<{ success: boolean; message: string; disabled: number }> {
	const root = getTownRoot(townRoot);
	const rigsJson = readRigsJson(root);
	let disabled = 0;

	for (const name of Object.keys(rigsJson.rigs)) {
		rigsJson.rigs[name].enabled = false;

		// Stop witness
		if (isWitnessRunning(name)) {
			try {
				const sessionName = `gt-${name}-witness`;
				execSync(`tmux kill-session -t ${sessionName} 2>/dev/null`, {
					stdio: "pipe",
				});
			} catch {
				// Ignore
			}
		}
		disabled++;
	}

	writeRigsJson(root, rigsJson);

	return { success: true, message: `Disabled ${disabled} rigs`, disabled };
}
