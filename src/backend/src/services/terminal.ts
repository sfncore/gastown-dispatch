import { WebSocket, WebSocketServer } from "ws";
import { spawn, ChildProcess } from "child_process";
import type { Server } from "http";

interface TerminalSession {
	ws: WebSocket;
	tmuxProc: ChildProcess | null;
	pane: string;
}

class TerminalService {
	private wss: WebSocketServer | null = null;
	private sessions: Map<WebSocket, TerminalSession> = new Map();

	attach(server: Server): void {
		this.wss = new WebSocketServer({ server, path: "/terminal" });

		this.wss.on("connection", (ws, req) => {
			// Parse pane from query string: /terminal?pane=hq-mayor
			const url = new URL(req.url || "", `http://${req.headers.host}`);
			const pane = url.searchParams.get("pane") || "hq-mayor";

			console.log(`Terminal WebSocket connected for pane: ${pane}`);

			const session: TerminalSession = {
				ws,
				tmuxProc: null,
				pane,
			};
			this.sessions.set(ws, session);

			// Start streaming tmux output
			this.startTmuxStream(session);

			// Handle input from client
			ws.on("message", (data) => {
				const message = data.toString();
				try {
					const parsed = JSON.parse(message);
					if (parsed.type === "input") {
						this.sendToTmux(session.pane, parsed.data);
					} else if (parsed.type === "resize") {
						this.resizeTmux(session.pane, parsed.cols, parsed.rows);
					}
				} catch {
					// Raw input fallback
					this.sendToTmux(session.pane, message);
				}
			});

			ws.on("close", () => {
				console.log(`Terminal WebSocket disconnected for pane: ${pane}`);
				this.cleanup(session);
				this.sessions.delete(ws);
			});

			ws.on("error", (err) => {
				console.error(`Terminal WebSocket error for pane ${pane}:`, err);
				this.cleanup(session);
				this.sessions.delete(ws);
			});
		});

		console.log("Terminal WebSocket server attached at /terminal");
	}

	private startTmuxStream(session: TerminalSession): void {
		// Use tmux pipe-pane to stream output, or capture-pane polling
		// For real-time streaming, we use a control mode approach
		this.streamWithCapture(session);
	}

	private streamWithCapture(session: TerminalSession): void {
		let initialized = false;
		let lastFrame = "";

		// Step 1: Send scrollback-only history, then visible frame separately
		// This prevents duplicates when scrollback includes visible content
		const sendInit = () => {
			// First get the visible pane height
			const sizeProc = spawn("tmux", [
				"display-message",
				"-t",
				session.pane,
				"-p",
				"#{pane_height}",
			]);

			let paneHeight = 0;
			sizeProc.stdout?.on("data", (data: Buffer) => {
				paneHeight = parseInt(data.toString().trim(), 10) || 24;
			});

			sizeProc.on("close", () => {
				// Now capture scrollback ONLY (excluding visible area)
				// -S - means from start of scrollback
				// -E -<paneHeight> means stop at -paneHeight lines (before visible)
				const scrollbackProc = spawn("tmux", [
					"capture-pane",
					"-t",
					session.pane,
					"-p",
					"-e", // Include escape sequences
					"-S",
					"-", // From start of scrollback
					"-E",
					`-${paneHeight + 1}`, // Stop before visible area
				]);

				let scrollback = "";
				scrollbackProc.stdout?.on("data", (data: Buffer) => {
					scrollback += data.toString();
				});

				scrollbackProc.on("close", () => {
					// Then get the visible frame
					const frameProc = spawn("tmux", [
						"capture-pane",
						"-t",
						session.pane,
						"-p",
						"-e", // Include escape sequences
						// No -S/-E = just visible pane
					]);

					let frame = "";
					frameProc.stdout?.on("data", (data: Buffer) => {
						frame += data.toString();
					});

					frameProc.on("close", () => {
						if (session.ws.readyState === WebSocket.OPEN) {
							// Send scrollback first (if any), then frame separately
							// Client will handle scrollback without clearing, then frame with clear
							if (scrollback.trim()) {
								session.ws.send(
									JSON.stringify({ type: "scrollback", data: scrollback }),
								);
							}
							session.ws.send(JSON.stringify({ type: "frame", data: frame }));
							lastFrame = frame;
							initialized = true;
							startPolling();
						}
					});
				});
			});
		};

		// Step 2: Poll for visible pane updates (frames)
		const pollFrame = () => {
			if (session.ws.readyState !== WebSocket.OPEN || !initialized) return;

			const proc = spawn("tmux", [
				"capture-pane",
				"-t",
				session.pane,
				"-p",
				"-e", // Include escape sequences
				// No -S/-E = just visible pane
			]);

			let output = "";
			proc.stdout?.on("data", (data: Buffer) => {
				output += data.toString();
			});

			proc.on("close", () => {
				// Only send if content changed
				if (output !== lastFrame) {
					lastFrame = output;
					if (session.ws.readyState === WebSocket.OPEN) {
						session.ws.send(JSON.stringify({ type: "frame", data: output }));
					}
				}
			});
		};

		let intervalId: NodeJS.Timeout | null = null;

		const startPolling = () => {
			intervalId = setInterval(pollFrame, 100);
		};

		// Start with init
		sendInit();

		// Store cleanup function
		session.tmuxProc = {
			kill: () => {
				if (intervalId) clearInterval(intervalId);
			},
		} as any;
	}

	private sendToTmux(pane: string, keys: string): void {
		// Send keystrokes to tmux pane
		spawn("tmux", ["send-keys", "-t", pane, "-l", keys]);
	}

	private resizeTmux(pane: string, cols: number, rows: number): void {
		// Resize the tmux window and pane to match the web terminal
		if (cols > 0 && rows > 0) {
			console.log(`Resizing tmux ${pane} to ${cols}x${rows}`);
			// Extract session name from pane (e.g., "hq-mayor" -> "hq-mayor")
			const session = pane.split(":")[0];
			// Resize window first (pane can't be bigger than window)
			spawn("tmux", [
				"resize-window",
				"-t",
				session,
				"-x",
				String(cols),
				"-y",
				String(rows),
			]);
			// Then resize pane
			spawn("tmux", [
				"resize-pane",
				"-t",
				pane,
				"-x",
				String(cols),
				"-y",
				String(rows),
			]);
		}
	}

	private cleanup(session: TerminalSession): void {
		if (session.tmuxProc) {
			session.tmuxProc.kill();
			session.tmuxProc = null;
		}
	}

	// Get list of available tmux panes (Gas Town agents)
	async listPanes(): Promise<
		Array<{ name: string; session: string; active: boolean }>
	> {
		return new Promise((resolve) => {
			const proc = spawn("tmux", [
				"list-panes",
				"-a",
				"-F",
				"#{session_name}:#{pane_title}:#{pane_active}",
			]);

			let output = "";
			proc.stdout?.on("data", (data: Buffer) => {
				output += data.toString();
			});

			proc.on("close", () => {
				const panes = output
					.split("\n")
					.filter(Boolean)
					.map((line) => {
						const [session, title, active] = line.split(":");
						return {
							name: title || session,
							session,
							active: active === "1",
						};
					})
					.filter((p) => p.session.startsWith("hq-")); // Only Gas Town sessions

				resolve(panes);
			});

			proc.on("error", () => resolve([]));
		});
	}
}

export const terminalService = new TerminalService();
