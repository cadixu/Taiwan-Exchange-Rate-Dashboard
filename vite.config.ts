import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // The third parameter '' means load all env vars regardless of prefix
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [react()],
    // Relative base path for GitHub Pages compatibility
    base: './',
    define: {
      // Critical Fix: Ensure we check both the loaded .env object AND the system process.env
      // This ensures it works locally (.env) and in GitHub Actions (Secrets)
      'process.env.API_KEY': JSON.stringify(env.API_KEY || process.env.API_KEY),
      // Define an empty process.env to prevent "process is not defined" crashes in some libs
      'process.env': {}
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false
    }
  };
});