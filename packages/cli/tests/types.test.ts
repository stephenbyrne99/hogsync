import { describe, expect, test } from 'bun:test';
import type { Config, FlagConfig } from '../src/types';

describe('Type Definitions', () => {
  test('should validate FlagConfig interface', () => {
    const validFlag: FlagConfig = {
      key: 'test-flag',
      name: 'Test Flag',
      active: true,
    };

    expect(validFlag.key).toBe('test-flag');
    expect(validFlag.name).toBe('Test Flag');
    expect(validFlag.active).toBe(true);
  });

  test('should support optional FlagConfig properties', () => {
    const flagWithOptionals: FlagConfig = {
      key: 'advanced-flag',
      name: 'Advanced Flag',
      active: false,
      description: 'A test flag with optional properties',
      ensure_experience_continues: true,
      filters: { properties: [] },
      variants: [{ key: 'control', name: 'Control' }],
    };

    expect(flagWithOptionals.description).toBe('A test flag with optional properties');
    expect(flagWithOptionals.ensure_experience_continues).toBe(true);
    expect(flagWithOptionals.filters).toEqual({ properties: [] });
    expect(flagWithOptionals.variants).toHaveLength(1);
  });

  test('should validate Config interface', () => {
    const validConfig: Config = {
      flagsDir: 'feature-flags',
      outputFile: 'src/generated/feature-flags.ts',
      posthog: {
        host: 'https://app.posthog.com',
        projectId: 'test-project',
        apiToken: 'test-token',
      },
    };

    expect(validConfig.flagsDir).toBe('feature-flags');
    expect(validConfig.posthog.host).toBe('https://app.posthog.com');
    expect(validConfig.posthog.projectId).toBe('test-project');
  });

  test('should support optional Config generation settings', () => {
    const configWithGeneration: Config = {
      flagsDir: 'flags',
      outputFile: 'types/flags.ts',
      posthog: {
        host: 'https://test.posthog.com',
        projectId: 'project',
        apiToken: 'token',
      },
      generation: {
        includeLocalConfigs: false,
        namingConvention: 'camelCase',
        generateReactTemplate: true,
      },
    };

    expect(configWithGeneration.generation?.includeLocalConfigs).toBe(false);
    expect(configWithGeneration.generation?.namingConvention).toBe('camelCase');
    expect(configWithGeneration.generation?.generateReactTemplate).toBe(true);
  });
});
