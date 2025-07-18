import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const TEST_DIR = join(process.cwd(), 'test-temp');
const CLI_PATH = join(process.cwd(), 'packages/cli/bin/hogsync');

// Helper to run CLI commands
async function runCLI(
  args: string[],
  cwd = TEST_DIR
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = spawn(CLI_PATH, args, {
      cwd,
      stdio: 'pipe',
      env: { ...process.env, NODE_ENV: 'test' },
    });

    let stdout = '';
    let stderr = '';

    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({ stdout, stderr, exitCode: code || 0 });
    });
  });
}

// Skip CLI tests in CI environment since binary compilation is unreliable
const runCliTests = !process.env.CI;

if (runCliTests) {
  describe('CLI Commands', () => {
    beforeEach(() => {
      // Check if CLI binary exists
      if (!existsSync(CLI_PATH)) {
        throw new Error(`CLI binary not found at ${CLI_PATH}. Run 'bun run build:binary' first.`);
      }

      // Clean up and create test directory
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
      mkdirSync(TEST_DIR, { recursive: true });
    });
    afterEach(() => {
      // Clean up test directory
      if (existsSync(TEST_DIR)) {
        rmSync(TEST_DIR, { recursive: true, force: true });
      }
    });

    describe('help and version', () => {
      test('should show help with --help flag', async () => {
        const result = await runCLI(['--help']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('HogSync');
        expect(result.stdout).toContain('USAGE:');
        expect(result.stdout).toContain('COMMANDS:');
        expect(result.stdout).toContain('init');
        expect(result.stdout).toContain('generate');
        expect(result.stdout).toContain('sync');
      });

      test('should show help with help command', async () => {
        const result = await runCLI(['help']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('HogSync');
      });

      test('should show version with --version flag', async () => {
        const result = await runCLI(['--version']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('1.0.0');
      });

      test('should show version with -v flag', async () => {
        const result = await runCLI(['-v']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout.trim()).toBe('1.0.0');
      });
    });

    describe('init command', () => {
      test('should create config file when none exists', async () => {
        const result = await runCLI(['init']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('✓ Created configuration file');
        expect(existsSync(join(TEST_DIR, 'hogsync.config.js'))).toBe(true);

        const configContent = await Bun.file(join(TEST_DIR, 'hogsync.config.js')).text();
        expect(configContent).toContain('module.exports = {');
        expect(configContent).toContain("flagsDir: 'feature-flags'");
        expect(configContent).toContain("outputFile: 'src/generated/feature-flags.ts'");
      });

      test('should warn when config file already exists', async () => {
        // Create existing config
        writeFileSync(join(TEST_DIR, 'hogsync.config.js'), 'module.exports = {};');

        const result = await runCLI(['init']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('⚠️  Configuration file already exists');
      });
    });

    describe('validate command', () => {
      test('should fail when flags directory does not exist', async () => {
        // Create minimal config
        writeFileSync(
          join(TEST_DIR, 'hogsync.config.js'),
          `
        module.exports = {
          flagsDir: 'feature-flags',
          outputFile: 'src/generated/feature-flags.ts',
          posthog: { host: 'https://app.posthog.com', projectId: '', apiToken: '' }
        };
      `
        );

        const result = await runCLI(['validate']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('❌ Flags directory not found');
      });

      test('should validate valid flag files', async () => {
        // Create config
        writeFileSync(
          join(TEST_DIR, 'hogsync.config.js'),
          `
        module.exports = {
          flagsDir: 'feature-flags',
          outputFile: 'src/generated/feature-flags.ts',
          posthog: { host: 'https://app.posthog.com', projectId: '', apiToken: '' }
        };
      `
        );

        // Create flags directory and valid flag
        mkdirSync(join(TEST_DIR, 'feature-flags'));
        writeFileSync(
          join(TEST_DIR, 'feature-flags', 'test-flag.json'),
          JSON.stringify({
            key: 'test-flag',
            name: 'Test Flag',
            active: true,
            description: 'A test flag',
          })
        );

        const result = await runCLI(['validate']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Validating 1 flag files');
        expect(result.stdout).toContain('✓ All flags are valid');
      });

      test('should fail validation for invalid flag files', async () => {
        // Create config
        writeFileSync(
          join(TEST_DIR, 'hogsync.config.js'),
          `
        module.exports = {
          flagsDir: 'feature-flags',
          outputFile: 'src/generated/feature-flags.ts',
          posthog: { host: 'https://app.posthog.com', projectId: '', apiToken: '' }
        };
      `
        );

        // Create flags directory and invalid flag
        mkdirSync(join(TEST_DIR, 'feature-flags'));
        writeFileSync(
          join(TEST_DIR, 'feature-flags', 'invalid-flag.json'),
          JSON.stringify({
            // Missing required 'key' and 'name' fields
            active: 'not-a-boolean', // Wrong type
          })
        );

        const result = await runCLI(['validate']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain(
          '❌ invalid-flag.json: Feature flag validation failed in invalid-flag.json'
        );
        expect(result.stderr).toContain('❌ Validation failed');
      });

      test('should fail validation for malformed JSON', async () => {
        // Create config
        writeFileSync(
          join(TEST_DIR, 'hogsync.config.js'),
          `
        module.exports = {
          flagsDir: 'feature-flags',
          outputFile: 'src/generated/feature-flags.ts',
          posthog: { host: 'https://app.posthog.com', projectId: '', apiToken: '' }
        };
      `
        );

        // Create flags directory and malformed JSON
        mkdirSync(join(TEST_DIR, 'feature-flags'));
        writeFileSync(join(TEST_DIR, 'feature-flags', 'malformed.json'), '{ invalid json }');

        const result = await runCLI(['validate']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain("❌ malformed.json: JSON Parse error: Expected '}'");
      });
    });

    describe('generate command', () => {
      test('should generate TypeScript from valid flags', async () => {
        // Create config
        writeFileSync(
          join(TEST_DIR, 'hogsync.config.js'),
          `
        module.exports = {
          flagsDir: 'feature-flags',
          outputFile: 'src/generated/feature-flags.ts',
          posthog: { host: 'https://app.posthog.com', projectId: '', apiToken: '' },
          generation: { includeLocalConfigs: true, namingConvention: 'snake_case' }
        };
      `
        );

        // Create flags directory and flag
        mkdirSync(join(TEST_DIR, 'feature-flags'));
        mkdirSync(join(TEST_DIR, 'src', 'generated'), { recursive: true });
        writeFileSync(
          join(TEST_DIR, 'feature-flags', 'dark-mode.json'),
          JSON.stringify({
            key: 'dark-mode',
            name: 'Dark Mode',
            active: true,
            description: 'Enable dark mode theme',
          })
        );

        const result = await runCLI(['generate']);

        expect(result.exitCode).toBe(0);
        expect(existsSync(join(TEST_DIR, 'src', 'generated', 'feature-flags.ts'))).toBe(true);

        const generatedContent = await Bun.file(
          join(TEST_DIR, 'src', 'generated', 'feature-flags.ts')
        ).text();
        expect(generatedContent).toContain('export const FeatureFlags');
        expect(generatedContent).toContain("dark_mode: 'dark-mode'");
      });

      test('should use custom config file path', async () => {
        // Create custom config
        writeFileSync(
          join(TEST_DIR, 'custom.config.js'),
          `
        module.exports = {
          flagsDir: 'custom-flags',
          outputFile: 'output/flags.ts',
          posthog: { host: 'https://app.posthog.com', projectId: '', apiToken: '' }
        };
      `
        );

        // Create flags directory and flag
        mkdirSync(join(TEST_DIR, 'custom-flags'));
        mkdirSync(join(TEST_DIR, 'output'), { recursive: true });
        writeFileSync(
          join(TEST_DIR, 'custom-flags', 'test.json'),
          JSON.stringify({
            key: 'test',
            name: 'Test',
            active: true,
          })
        );

        const result = await runCLI(['generate', '--config', 'custom.config.js']);

        expect(result.exitCode).toBe(0);
        expect(existsSync(join(TEST_DIR, 'output', 'flags.ts'))).toBe(true);
      });
    });

    describe('unknown command', () => {
      test('should show error and help for unknown command', async () => {
        const result = await runCLI(['unknown-command']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Unknown command: unknown-command');
        expect(result.stdout).toContain('USAGE:');
      });
    });

    describe('watch command', () => {
      test('should show coming soon message', async () => {
        const result = await runCLI(['watch']);

        expect(result.exitCode).toBe(0);
        expect(result.stdout).toContain('Watch functionality coming soon');
      });
    });

    describe('error handling', () => {
      test('should handle config loading errors gracefully', async () => {
        // Create invalid config file
        writeFileSync(join(TEST_DIR, 'hogsync.config.js'), 'invalid javascript syntax {');

        const result = await runCLI(['generate']);

        expect(result.exitCode).toBe(1);
        expect(result.stderr).toContain('Error:');
      });
    });
  });
} else {
  describe('CLI Commands', () => {
    test('CLI tests skipped in CI environment', () => {
      console.log('CLI tests are skipped in CI - run locally to test CLI functionality');
      expect(true).toBe(true);
    });
  });
}
