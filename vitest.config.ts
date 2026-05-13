import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      '@attriax/js': path.resolve(dirname, '../sdk-js/src/index.ts'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.tsx'],
    setupFiles: ['test/setup.ts'],
  },
});

