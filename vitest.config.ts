import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_TI_API_TOKEN': JSON.stringify('test_token_123'),
    'import.meta.env.VITE_TI_API_URL': JSON.stringify('http://localhost:8000/api'),
    'import.meta.env.VITE_TI_BASE_URL': JSON.stringify('http://localhost:8000'),
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
    include: ['src/__tests__/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/__tests__/**', 'src/vite-env.d.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      'virtual:pwa-register/react': path.resolve(__dirname, 'src/__tests__/mocks/pwa-register.ts'),
    },
  },
});
