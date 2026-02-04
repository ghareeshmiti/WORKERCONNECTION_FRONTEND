import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from "fs";
import { componentTagger } from "lovable-tagger";

let httpsConfig = undefined;
try {
  // Only try to load certs if we are in local dev where they exist
  const keyPath = path.resolve(process.cwd(), '../key.pem');
  const certPath = path.resolve(process.cwd(), '../cert.pem');
  if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
    httpsConfig = {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath),
    };
  }
} catch (e) {
  console.log("No SSL keys found, skipping HTTPS setup.");
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::", // Listen on all IPv6/IPv4 interfaces
    port: 5173, // Default to 5173 to match previous setup
    https: httpsConfig,
    allowedHosts: true, // Allow ngrok/tunnel hosts
    proxy: {
      '/api': {
        target: 'https://localhost:3000',
        changeOrigin: true,
        secure: false, // Allow self-signed certs
      }
    }
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
