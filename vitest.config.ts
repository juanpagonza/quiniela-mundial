import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    // Default to node — non-React code (clients, helpers, server actions).
    // Override per-file with the `// @vitest-environment jsdom` directive when
    // testing React components.
    environment: 'node',
    // Patterns to find tests. Tests live in __tests__ folders next to the code,
    // or alongside source as *.test.ts.
    include: ['**/__tests__/**/*.test.ts', '**/*.test.ts'],
    // Force UTC so date-fns formatting in lib/dates is deterministic regardless
    // of the developer's local timezone.
    env: { TZ: 'UTC' },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
})
