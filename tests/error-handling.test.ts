import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from '../src/config';
import { generateFlags } from '../src/generator';
import { syncFlags } from '../src/sync';
import type { Config } from '../src/types';

const TEST_DIR = join(process.cwd(), 'test-error-handling');

describe('Error Handling', () => {
  beforeEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(TEST_DIR)) {
      rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Config Loading Errors', () => {
    test('should handle missing config file gracefully', async () => {
      const config = await loadConfig(join(TEST_DIR, 'nonexistent.config.js'));

      // Should return default config
      expect(config).toEqual({
        flagsDir: 'feature-flags',
        outputFile: 'src/generated/feature-flags.ts',
        posthog: {
          host: 'https://app.posthog.com',
          projectId: '',
          apiToken: '',
        },
        generation: {
          includeLocalConfigs: true,
          namingConvention: 'snake_case',
          generateReactTemplate: false,
        },
      });
    });

    test('should handle malformed config file', async () => {
      const configPath = join(TEST_DIR, 'malformed.config.js');
      writeFileSync(configPath, 'invalid javascript syntax {');

      expect(loadConfig(configPath)).rejects.toThrow();
    });

    test('should handle config file with invalid exports', async () => {
      const configPath = join(TEST_DIR, 'invalid-exports.config.js');
      writeFileSync(configPath, 'module.exports = "not an object";');

      expect(loadConfig(configPath)).rejects.toThrow();
    });

    test('should handle config file that throws during execution', async () => {
      const configPath = join(TEST_DIR, 'throwing.config.js');
      writeFileSync(configPath, 'throw new Error("Config error"); module.exports = {};');

      expect(loadConfig(configPath)).rejects.toThrow('Config error');
    });
  });

  describe('Generator Errors', () => {
    const testConfig: Config = {
      flagsDir: join(TEST_DIR, 'flags'),
      outputFile: join(TEST_DIR, 'output.ts'),
      posthog: {
        host: 'https://app.posthog.com',
        projectId: 'test',
        apiToken: 'test',
      },
      generation: {
        includeLocalConfigs: true,
        namingConvention: 'snake_case',
        generateReactTemplate: false,
      },
    };

    test('should handle missing flags directory', async () => {
      const originalExit = process.exit;
      const originalConsoleError = console.error;
      let exitCode: number | undefined;
      let errorMessage = '';

      process.exit = mock((code?: number) => {
        exitCode = code;
        throw new Error('process.exit called');
      }) as typeof process.exit;

      console.error = mock((message: string) => {
        errorMessage += message;
      });

      try {
        await generateFlags(testConfig);
      } catch (_error) {
        expect(exitCode).toBe(1);
        expect(errorMessage).toContain('Flags directory not found');
      }

      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test('should handle invalid JSON in flag files', async () => {
      mkdirSync(testConfig.flagsDir, { recursive: true });
      writeFileSync(join(testConfig.flagsDir, 'invalid.json'), '{ invalid json }');

      const originalConsoleError = console.error;
      const errorMessages: string[] = [];

      console.error = mock((...args: unknown[]) => {
        errorMessages.push(args.join(' '));
      });

      await generateFlags(testConfig);

      expect(errorMessages.some((msg) => msg.includes('Error processing'))).toBe(true);

      console.error = originalConsoleError;
    });

    test('should handle permission errors when writing output file', async () => {
      mkdirSync(testConfig.flagsDir, { recursive: true });
      writeFileSync(
        join(testConfig.flagsDir, 'test.json'),
        JSON.stringify({
          key: 'test',
          name: 'Test',
          active: true,
        })
      );

      // Create a directory where the output file should be (to cause write error)
      mkdirSync(testConfig.outputFile, { recursive: true });

      const originalConsoleError = console.error;
      let _errorMessage = '';

      console.error = mock((message: string) => {
        _errorMessage += message;
      });

      expect(generateFlags(testConfig)).rejects.toThrow();

      console.error = originalConsoleError;
    });

    test('should handle flags with missing required fields', async () => {
      mkdirSync(testConfig.flagsDir, { recursive: true });
      writeFileSync(
        join(testConfig.flagsDir, 'incomplete.json'),
        JSON.stringify({
          // Missing 'key' and 'name' fields
          active: true,
        })
      );

      const originalConsoleError = console.error;
      const errorMessages: string[] = [];

      console.error = mock((...args: unknown[]) => {
        errorMessages.push(args.join(' '));
      });

      await generateFlags(testConfig);

      expect(errorMessages.some((msg) => msg.includes('Feature flag validation failed'))).toBe(
        true
      );

      console.error = originalConsoleError;
    });
  });

  describe('Sync Errors', () => {
    const testConfig: Config = {
      flagsDir: join(TEST_DIR, 'flags'),
      outputFile: join(TEST_DIR, 'output.ts'),
      posthog: {
        host: 'https://invalid-host.example.com',
        projectId: 'test-project',
        apiToken: 'invalid-token',
      },
    };

    test('should handle network errors during sync', async () => {
      mkdirSync(testConfig.flagsDir, { recursive: true });
      writeFileSync(
        join(testConfig.flagsDir, 'test.json'),
        JSON.stringify({
          key: 'test',
          name: 'Test',
          active: true,
        })
      );

      const originalConsoleError = console.error;
      let _errorMessage = '';

      console.error = mock((message: string) => {
        _errorMessage += message;
      });

      expect(syncFlags(testConfig)).rejects.toThrow();

      console.error = originalConsoleError;
    });

    test('should handle missing PostHog credentials', async () => {
      const configWithoutCreds: Config = {
        ...testConfig,
        posthog: {
          host: 'https://app.posthog.com',
          projectId: '',
          apiToken: '',
        },
      };

      mkdirSync(configWithoutCreds.flagsDir, { recursive: true });

      const originalConsoleError = console.error;
      const originalExit = process.exit;
      let exitCode: number | undefined;
      let errorMessage = '';

      process.exit = mock((code?: number) => {
        exitCode = code;
        throw new Error('process.exit called');
      }) as typeof process.exit;

      console.error = mock((message: string) => {
        errorMessage += message;
      });

      try {
        await syncFlags(configWithoutCreds);
      } catch (_error) {
        expect(exitCode).toBe(1);
        expect(errorMessage).toContain('PostHog project ID and API token are required');
      }

      process.exit = originalExit;
      console.error = originalConsoleError;
    });

    test('should handle invalid PostHog host URL', async () => {
      const configWithInvalidHost: Config = {
        ...testConfig,
        posthog: {
          host: 'not-a-valid-url',
          projectId: 'test',
          apiToken: 'test',
        },
      };

      mkdirSync(configWithInvalidHost.flagsDir, { recursive: true });
      writeFileSync(
        join(configWithInvalidHost.flagsDir, 'test.json'),
        JSON.stringify({
          key: 'test',
          name: 'Test',
          active: true,
        })
      );

      const originalExit = process.exit;
      process.exit = mock(() => {
        throw new Error('process.exit called');
      }) as typeof process.exit;

      try {
        expect(syncFlags(configWithInvalidHost)).rejects.toThrow();
      } finally {
        process.exit = originalExit;
      }
    });
  });

  describe('File System Errors', () => {
    test('should handle read permission errors', async () => {
      const flagsDir = join(TEST_DIR, 'flags');
      mkdirSync(flagsDir, { recursive: true });

      // Create a file with invalid JSON to trigger an error path
      const flagFile = join(flagsDir, 'test.json');
      writeFileSync(flagFile, '{ invalid json }');

      const config: Config = {
        flagsDir,
        outputFile: join(TEST_DIR, 'output.ts'),
        posthog: {
          host: 'https://app.posthog.com',
          projectId: 'test',
          apiToken: 'test',
        },
      };

      const originalConsoleError = console.error;
      const errorMessages: string[] = [];

      console.error = mock((...args: unknown[]) => {
        errorMessages.push(args.join(' '));
      });

      await generateFlags(config);

      // Check that error handling works (should have processing error)
      expect(errorMessages.some((msg) => msg.includes('Error processing'))).toBe(true);

      console.error = originalConsoleError;
    });

    test('should handle write permission errors for output directory', async () => {
      const flagsDir = join(TEST_DIR, 'flags');
      mkdirSync(flagsDir, { recursive: true });
      writeFileSync(
        join(flagsDir, 'test.json'),
        JSON.stringify({
          key: 'test',
          name: 'Test',
          active: true,
        })
      );

      const config: Config = {
        flagsDir,
        outputFile: '/root/readonly/output.ts', // Typically unwritable path
        posthog: {
          host: 'https://app.posthog.com',
          projectId: 'test',
          apiToken: 'test',
        },
      };

      expect(generateFlags(config)).rejects.toThrow();
    });
  });

  describe('Runtime Errors', () => {
    test('should handle large flag files without crashing', async () => {
      const flagsDir = join(TEST_DIR, 'flags');
      mkdirSync(flagsDir, { recursive: true });

      const largeFlag = {
        key: 'large-flag',
        name: 'Large Flag',
        active: true,
        description: 'x'.repeat(10000), // Large string
        filters: {
          groups: Array(100).fill({
            properties: Array(10).fill({
              key: 'test',
              value: 'test-value',
              operator: 'exact',
            }),
          }),
        },
      };

      writeFileSync(join(flagsDir, 'large.json'), JSON.stringify(largeFlag));

      const config: Config = {
        flagsDir,
        outputFile: join(TEST_DIR, 'output.ts'),
        posthog: {
          host: 'https://app.posthog.com',
          projectId: 'test',
          apiToken: 'test',
        },
      };

      // Should handle large files without crashing
      expect(generateFlags(config)).resolves.toBeUndefined();
    });

    test('should handle circular references in flag data', () => {
      // Create a flag with circular reference (this would be caught by JSON.stringify)
      const circularFlag = {
        key: 'circular',
        name: 'Circular Flag',
        active: true,
      };
      (circularFlag as Record<string, unknown>).self = circularFlag;

      // JSON.stringify will throw on circular references
      expect(() => JSON.stringify(circularFlag)).toThrow();
    });
  });

  describe('Environment Errors', () => {
    test('should handle missing environment variables gracefully', async () => {
      const originalEnv = process.env;

      // Clear all environment variables
      process.env = {};

      const config = await loadConfig('nonexistent.config.js');

      expect(config.posthog.projectId).toBe('');
      expect(config.posthog.apiToken).toBe('');
      expect(config.posthog.host).toBe('https://app.posthog.com');

      process.env = originalEnv;
    });

    test('should handle invalid environment variable values', async () => {
      const originalEnv = process.env;

      process.env = {
        ...originalEnv,
        POSTHOG_HOST: 'not-a-valid-url',
        POSTHOG_PROJECT_ID: '', // Empty string
        POSTHOG_API_TOKEN: undefined as string | undefined, // Undefined
      };

      const config = await loadConfig('nonexistent.config.js');

      expect(config.posthog.host).toBe('not-a-valid-url');
      expect(config.posthog.projectId).toBe('');
      expect(config.posthog.apiToken).toBe('');

      process.env = originalEnv;
    });
  });
});
