import { defineConfig } from '@playwright/test';
import base from './playwright.config';

/** 演出中の1秒あたりのコマ数を測る（npx playwright test --config playwright.perf.config.ts）。スマホ相当に処理を遅くして測る */
export default defineConfig({
  ...base,
  testMatch: /perf\.spec\.ts/,
  testIgnore: undefined,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
});
