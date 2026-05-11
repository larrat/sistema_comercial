import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['src/react/features/clientes/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage/pilot-clientes',
      include: ['src/react/features/clientes/**/*.ts', 'src/react/features/clientes/**/*.tsx'],
      exclude: [
        'src/react/features/clientes/**/*.test.ts',
        'src/react/features/clientes/**/index.ts',
        'src/react/features/clientes/types.ts'
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 45
      }
    }
  }
});
