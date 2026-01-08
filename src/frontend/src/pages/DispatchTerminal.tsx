import { useState, useEffect, useCallback } from "react";
import { Terminal, TerminalApi } from "@/components/Terminal";
import { Wifi, WifiOff, Users, Zap } from "lucide-react";
import { CommandLegend } from "@/components/CommandLegend";

interface RigStatus {
	name: string;
	active: boolean;
	crew: number;
}

export default function DispatchTerminal() {
	const [connected, setConnected] = useState(false);
	const [selectedPane, setSelectedPane] = useState("hq-mayor");
	const [rigs, setRigs] = useState<RigStatus[]>([]);
	const [showRigWhisper, setShowRigWhisper] = useState(false);
	const [showLegend, setShowLegend] = useState(false);
	const [terminalApi, setTerminalApi] = useState<TerminalApi | null>(null);

	// Paste text to terminal without pressing Enter
	const pasteToTerminal = useCallback(
		(text: string) => {
			terminalApi?.paste(text);
		},
		[terminalApi],
	);

	// Fetch rig status for peripheral awareness (Atlas's whispers)
	useEffect(() => {
		const fetchStatus = async () => {
			try {
				const res = await fetch("/api/status");
				const data = await res.json();
				if (data.rigs) {
					setRigs(
						data.rigs.map((r: { name: string; crew_count?: number }) => ({
							name: r.name,
							active: (r.crew_count || 0) > 0,
							crew: r.crew_count || 0,
						})),
					);
				}
			} catch {
				// Silent fail - peripheral info is optional
			}
		};

		fetchStatus();
		const interval = setInterval(fetchStatus, 30000); // Refresh every 30s
		return () => clearInterval(interval);
	}, []);

	const activeRigs = rigs.filter((r) => r.active).length;

	return (
		<div className="h-full flex flex-col bg-[#0a0a0f] overflow-hidden">
			{/* Minimal top bar - Nova's respectful frame */}
			<div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-800/30 bg-[#0a0a0f]">
				{/* Left: Connection status */}
				<div className="flex items-center gap-2">
					{connected ? (
						<Wifi size={12} className="text-green-500/80" />
					) : (
						<WifiOff size={12} className="text-red-500/50" />
					)}
					<span className="text-[11px] text-zinc-600 font-mono">
						{selectedPane.replace("hq-", "")}
					</span>
				</div>

				{/* Center: Pane selector */}
				<select
					value={selectedPane}
					onChange={(e) => setSelectedPane(e.target.value)}
					className="bg-transparent border-none text-[11px] text-zinc-500 font-mono focus:outline-none cursor-pointer hover:text-zinc-400"
				>
					<option value="hq-mayor">mayor</option>
					<option value="hq-deacon">deacon</option>
					<option value="hq-witness">witness</option>
				</select>

				{/* Right: Fleet pulse */}
				<button
					onClick={() => setShowRigWhisper(!showRigWhisper)}
					className="flex items-center gap-1.5 text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors"
					title="Toggle fleet awareness"
				>
					<Users size={10} />
					<span className="font-mono">{rigs.length}</span>
					{activeRigs > 0 && (
						<span className="flex items-center gap-0.5 text-yellow-500/50">
							<Zap size={8} />
							{activeRigs}
						</span>
					)}
				</button>
			</div>

			{/* Main terminal area - Hex's sacred space */}
			<div className="flex-1 flex overflow-hidden min-h-0">
				{/* Terminal - the truth */}
				<div className="flex-1 min-w-0 min-h-0">
					<Terminal
						pane={selectedPane}
						onConnectionChange={setConnected}
						onReady={setTerminalApi}
						className="w-full h-full"
					/>
				</div>

				{/* Peripheral rig whisper panel (Atlas) - collapsible */}
				{showRigWhisper && rigs.length > 0 && (
					<div className="w-32 border-l border-zinc-800/30 bg-[#0a0a0f] overflow-y-auto">
						<div className="p-2 space-y-1">
							{rigs.slice(0, 20).map((rig) => (
								<div
									key={rig.name}
									className={`text-[10px] font-mono truncate transition-colors ${
										rig.active ? "text-yellow-500/60" : "text-zinc-700"
									}`}
									title={`${rig.name}${rig.active ? ` (${rig.crew} crew)` : ""}`}
								>
									{rig.active && (
										<span className="inline-block w-1 h-1 rounded-full bg-yellow-500 mr-1" />
									)}
									{rig.name.slice(0, 12)}
								</div>
							))}
							{rigs.length > 20 && (
								<div className="text-[10px] text-zinc-600 font-mono">
									+{rigs.length - 20} more
								</div>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Command Dock */}
			<button
				onClick={() => setShowLegend(true)}
				className="w-full py-2.5 bg-orange-950/40 border-t border-orange-900/50 hover:bg-orange-900/30 transition-all cursor-pointer"
			>
				<span className="text-xs font-medium tracking-[0.25em] text-orange-400/70 hover:text-orange-300/80">
					COMMAND DOCK
				</span>
			</button>

			{/* Command Legend Modal */}
			{showLegend && (
				<CommandLegend
					isOpen={showLegend}
					onInsertCommand={(cmd) => {
						pasteToTerminal(cmd);
						setShowLegend(false);
					}}
					onClose={() => setShowLegend(false)}
				/>
			)}
		</div>
	);
}
