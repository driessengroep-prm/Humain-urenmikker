import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// De site draait op GitHub Pages onder https://<org>.github.io/<repo>/.
// BASE_PATH kan in de workflow of lokaal overschreven worden ("/" voor een eigen domein).
const base = process.env.BASE_PATH ?? '/Humain-urenmikker/';

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
