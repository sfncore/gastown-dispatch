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
		port: 3000,
		proxy: {
			"/api/stream": {
				target: "http://localhost:3001",
				changeOrigin: true,
				// SSE requires these settings
				configure: (proxy) => {
					proxy.on("proxyReq", (proxyReq) => {
						proxyReq.setHeader("Connection", "keep-alive");
					});
				},
			},
			"/api": {
				target: "http://localhost:3001",
				changeOrigin: true,
			},
		},
	},
});
