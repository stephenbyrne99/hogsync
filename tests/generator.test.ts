import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { generateFlags } from '../src/generator';
import type { Config, FlagConfig } from '../src/types';

describe('Flag Generator', () => {
  const testDir = 'test-flags';
  const testConfig: Config = {
    flagsDir: testDir,
    outputFile: 'test-output.ts',
    posthog: {
      host: 'https://app.posthog.com',
      projectId: 'test',
      apiToken: 'test',
    },
  };

  beforeEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir);
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    if (existsSync('test-output.ts')) {
      rmSync('test-output.ts');
    }
  });

  test('should handle empty flags directory', async () => {
    await expect(generateFlags(testConfig)).resolves.toBeUndefined();
  });

  test('should process valid flag files', async () => {
    const flag: FlagConfig = {
      key: 'test-flag',
      name: 'Test Flag',
      active: true,
      description: 'A test flag',
    };

    writeFileSync(`${testDir}/test-flag.json`, JSON.stringify(flag, null, 2));

    await expect(generateFlags(testConfig)).resolves.toBeUndefined();
  });

  test('should handle malformed JSON files', async () => {
    writeFileSync(`${testDir}/bad-flag.json`, '{ invalid json }');

    await expect(generateFlags(testConfig)).resolves.toBeUndefined();
  });

  test('should exit with error when flags directory does not exist', async () => {
    const originalExit = process.exit;
    let exitCalled = false;

    process.exit = (() => {
      exitCalled = true;
      throw new Error('process.exit called');
    }) as typeof process.exit;

    const configWithBadDir = { ...testConfig, flagsDir: 'nonexistent-dir' };

    try {
      await generateFlags(configWithBadDir);
    } catch (_error) {
      expect(exitCalled).toBe(true);
    }

    process.exit = originalExit;
  });
});
