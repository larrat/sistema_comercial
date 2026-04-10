import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/pilot/clientes/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage/pilot-clientes',
      include: ['src/pilot/clientes/**/*.ts'],
      exclude: ['src/pilot/clientes/**/*.test.ts', 'src/pilot/clientes/index.ts'],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 45
      }
    }
  }
});
