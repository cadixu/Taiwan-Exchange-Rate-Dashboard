import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' means load all env vars regardless of prefix
  // Fix: Cast process to any to avoid TypeScript error "Property 'cwd' does not exist on type 'Process'"
  const env = loadEnv(mode, (process as any).cwd(), '');

  // CRITICAL FIX for GitHub Actions:
  // In the CI environment, the secret is in `process.env.API_KEY`.
  // In local development, it might be in `env.API_KEY` (loaded from .env).
  // We must prioritize the system process.env to catch the injected secret.
  const apiKey = process.env.API_KEY || env.API_KEY;

  // Add logging to debug build process (visible in GitHub Actions logs)
  console.log(`[Build Config] Mode: ${mode}`);
  console.log(`[Build Check] API_KEY found: ${!!apiKey} (Length: ${apiKey ? apiKey.length : 0})`);

  if (!apiKey) {
    console.warn('⚠️ WARNING: API_KEY is undefined! The app will not function correctly in production.');
    console.warn('👉 Please ensure you have set the API_KEY secret in GitHub Settings > Secrets > Actions.');
  }

  return {
    plugins: [react()],
    // Relative base path for GitHub Pages compatibility
    base: './',
    define: {
      // We explicitly replace ONLY the specific API Key string.
      // DO NOT define 'process.env': {} here, as it overwrites the specific key replacement below,
      // causing the key to become undefined in the built production code.
      'process.env.API_KEY': JSON.stringify(apiKey),
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false
    }
  };
});