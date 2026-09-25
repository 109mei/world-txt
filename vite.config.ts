import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/world-txt/',
  plugins: [react()],
  // 内容のデータ（法則・出来事・副作用の文章）を1つにまとめているので、既定の 500kB を少し超える
  build: { chunkSizeWarningLimit: 700 },
  server: { port: 5174 },
  preview: { port: 4174 },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    testTimeout: 120_000,
  },
});
