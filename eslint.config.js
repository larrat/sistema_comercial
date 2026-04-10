import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: [
      'node_modules/**',
      'test-results/**',
      'docs/**',
      'sql/**',
      '.git/**',
      '.vscode/**'
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.js', 'tests/**/*.js', '*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-assignment': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'error'
    }
  },
  {
    files: ['src/**/*.ts', 'src/**/*.d.ts', 'supabase/functions/**/*.ts'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: tseslint.parser,
      globals: {
        ...globals.browser,
        ...globals.node,
        Deno: 'readonly',
        crypto: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        XLSX: 'readonly'
      }
    },
    rules: {
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-useless-assignment': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-undef': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['src/**/*.js'],
    languageOptions: {
      globals: {
        XLSX: 'readonly'
      }
    }
  }
];
