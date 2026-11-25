import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { include: ['scripts/calibrate.test.ts'], testTimeout: 0, reporters: ['verbose'] } });
