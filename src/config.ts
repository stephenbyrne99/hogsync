import { existsSync } from 'node:fs';
import type { Config } from './types';

export async function loadConfig(configPath: string): Promise<Config> {
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

  if (!existsSync(configPath)) {
    console.log(`⚠️  Config file not found: ${configPath}`);
    console.log('Using default configuration with environment variables');
    return defaultConfig;
  }

  try {
    // Use dynamic import for ES modules or require for CommonJS
    let userConfig: any;
    if (configPath.endsWith('.js')) {
      // For CommonJS modules
      delete require.cache[require.resolve(`${process.cwd()}/${configPath}`)];
      userConfig = require(`${process.cwd()}/${configPath}`);
    } else {
      // For ES modules
      const configUrl = `file://${process.cwd()}/${configPath}`;
      userConfig = await import(`${configUrl}?t=${Date.now()}`);
      userConfig = userConfig.default || userConfig;
    }

    return {
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
  } catch (error) {
    console.error(`❌ Error loading config file ${configPath}:`, error.message);
    console.log('Using default configuration');
    return defaultConfig;
  }
}
