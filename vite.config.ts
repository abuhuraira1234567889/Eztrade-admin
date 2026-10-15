import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiProxyTarget = env.VITE_API_PROXY ?? "http://localhost:3001";

  const allowedHosts = [
    "internalops.ezfe.blockmob.xyz",
    "internalops.ezfe.blockmob.xyz",
  ];

  return {
    plugins: [react()],

    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },

    // For local development (vite dev)
    server: {
      host: true,
      port: 5176,
      strictPort: true,
      allowedHosts: allowedHosts,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/auth": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    // For production preview (vite preview) on the server
    preview: {
      host: true,
      port: 5176,
      strictPort: true,
      allowedHosts: allowedHosts,
      proxy: {
        "/api": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
        "/auth": {
          target: apiProxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});