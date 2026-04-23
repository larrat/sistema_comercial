import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/react/test-setup.ts'],
    include: ['src/react/**/*.test.tsx', 'src/react/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: 'coverage/react',
      include: [
        'src/react/App.tsx',
        'src/react/app/**/*.ts',
        'src/react/app/**/*.tsx',
        'src/react/features/clientes/**/*.ts',
        'src/react/features/clientes/**/*.tsx',
        'src/react/features/produtos/**/*.ts',
        'src/react/features/produtos/**/*.tsx'
      ],
      exclude: [
        'src/react/**/*.test.*',
        'src/react/**/*.d.ts',
        'src/react/main.tsx',
        'src/react/test-setup.ts'
      ],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 }
    }
  }
});
