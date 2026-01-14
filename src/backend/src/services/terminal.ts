import { WebSocketServer } from "ws";
import { spawn } from "child_process";
import type { Server } from "http";
import { ptyService } from "./pty.js";

class TerminalService {
	private wss: WebSocketServer | null = null;

	attach(server: Server): void {
		this.wss = new WebSocketServer({ server, path: "/terminal" });

		// Start timeout checker for idle PTY sessions
		ptyService.startTimeoutChecker();

		this.wss.on("connection", (ws, req) => {
			// Parse pane from query string: /terminal?pane=hq-mayor
			const url = new URL(req.url || "", `http://${req.headers.host}`);
			const pane = url.searchParams.get("pane") || "hq-mayor";

			console.log(`Terminal WebSocket connected for pane: ${pane}`);

			// Create PTY session
			ptyService.createSession(ws, pane);

			// Handle input from client
			ws.on("message", (data) => {
				const message = data.toString();
				try {
					const parsed = JSON.parse(message);
					if (parsed.type === "input") {
						ptyService.sendInput(ws, parsed.data);
					} else if (parsed.type === "resize") {
						ptyService.resize(ws, parsed.cols, parsed.rows);
					}
				} catch {
					// Raw input fallback
					ptyService.sendInput(ws, message);
				}
			});

			ws.on("close", () => {
				console.log(`Terminal WebSocket disconnected for pane: ${pane}`);
				ptyService.cleanup(ws);
			});

			ws.on("error", (err) => {
				console.error(`Terminal WebSocket error for pane ${pane}:`, err);
				ptyService.cleanup(ws);
			});
		});

		console.log("Terminal WebSocket server attached at /terminal");
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
