import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
	plugins: [react()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./src"),
		},
	},
	server: {
		port: 4321,
		proxy: {
			"/api/stream": {
				target: "http://localhost:4320",
				changeOrigin: true,
				// SSE requires these settings
				configure: (proxy) => {
					proxy.on("proxyReq", (proxyReq) => {
						proxyReq.setHeader("Connection", "keep-alive");
					});
				},
			},
			"/api": {
				target: "http://localhost:4320",
				changeOrigin: true,
			},
		},
	},
});
