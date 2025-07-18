import { describe, expect, test } from 'bun:test';
import { loadConfig } from '../src/config';

describe('Config Loading', () => {
  test('should load default config when file does not exist', async () => {
    const config = await loadConfig('nonexistent.config.js');

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

  test('should use environment variables in default config', async () => {
    const originalEnv = process.env;
    process.env = {
      ...originalEnv,
      POSTHOG_HOST: 'https://test.posthog.com',
      POSTHOG_PROJECT_ID: 'test-project',
      POSTHOG_API_TOKEN: 'test-token',
    };

    const config = await loadConfig('nonexistent.config.js');

    expect(config.posthog.host).toBe('https://test.posthog.com');
    expect(config.posthog.projectId).toBe('test-project');
    expect(config.posthog.apiToken).toBe('test-token');

    process.env = originalEnv;
  });
});
