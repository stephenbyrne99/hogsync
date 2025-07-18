import { existsSync } from 'node:fs';
import type { Config } from './types';
import { validateConfig, validatePath } from './validation';

/**
 * Loads and merges configuration from a config file with default values and environment variables.
 *
 * @param configPath - Path to the configuration file (supports both CommonJS and ES modules)
 * @returns Promise that resolves to the merged configuration object
 *
 * @example
 * ```typescript
 * const config = await loadConfig('hogsync.config.js');
 * console.log(config.flagsDir); // 'feature-flags'
 * ```
 *
 * @remarks
 * - If the config file doesn't exist, returns default configuration
 * - Environment variables (POSTHOG_HOST, POSTHOG_PROJECT_ID, POSTHOG_API_TOKEN) override defaults
 * - User config values override both defaults and environment variables
 * - Supports both CommonJS (.js) and ES module (.mjs) config files
 */
export async function loadConfig(configPath: string): Promise<Config> {
  // Validate config path for security
  const safeConfigPath = validatePath(configPath);

  const defaultConfig: Config = {
    flagsDir: 'feature-flags',
    outputFile: 'src/generated/feature-flags.ts',
    posthog: {
      host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
      projectId: process.env.POSTHOG_PROJECT_ID || '',
      apiToken: process.env.POSTHOG_API_TOKEN || '',
    },
    generation: {
      includeLocalConfigs: true,
      namingConvention: 'snake_case',
      generateReactTemplate: false,
    },
  };

  if (!existsSync(safeConfigPath)) {
    console.log(`⚠️  Config file not found: ${configPath}`);
    console.log('Using default configuration with environment variables');
    return defaultConfig;
  }

  try {
    // Use dynamic import for ES modules or require for CommonJS
    let userConfig: Partial<Config>;
    if (safeConfigPath.endsWith('.js')) {
      // For CommonJS modules
      delete require.cache[require.resolve(safeConfigPath)];
      userConfig = require(safeConfigPath) as Partial<Config>;
    } else {
      // For ES modules
      const configUrl = `file://${safeConfigPath}`;
      const importedModule = (await import(`${configUrl}?t=${Date.now()}`)) as {
        default?: Partial<Config>;
      } & Partial<Config>;
      userConfig = importedModule.default || importedModule;
    }

    // Validate that userConfig is an object
    if (typeof userConfig !== 'object' || userConfig === null) {
      throw new Error('Config file must export an object');
    }

    const mergedConfig = {
      ...defaultConfig,
      ...userConfig,
      posthog: {
        ...defaultConfig.posthog,
        ...userConfig.posthog,
      },
      generation: {
        ...defaultConfig.generation,
        ...userConfig.generation,
      },
    };

    // Validate the final configuration
    validateConfig(mergedConfig);

    return mergedConfig;
  } catch (error) {
    console.error(
      `❌ Error loading config file ${configPath}:`,
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}
