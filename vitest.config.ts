// Config Vitest separata da vite.config.ts per tenere fuori lovable-tagger
// e ogni plugin di build dalla pipeline di test.
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/lib/brand/__tests__/**/*.test.ts'],
  },
});
