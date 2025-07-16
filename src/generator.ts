import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config, FlagConfig } from './types';

/**
 * Generates TypeScript constants and types from feature flag JSON files.
 *
 * @param config - Configuration object containing flags directory, output file, and generation options
 * @returns Promise that resolves when generation is complete
 *
 * @example
 * ```typescript
 * const config = {
 *   flagsDir: 'feature-flags',
 *   outputFile: 'src/generated/feature-flags.ts',
 *   generation: { namingConvention: 'snake_case' }
 * };
 * await generateFlags(config);
 * ```
 *
 * @remarks
 * - Scans the flags directory for *.json files
 * - Validates each flag file has required fields (key, name, active)
 * - Generates type-safe constants with configurable naming conventions
 * - Creates local development configurations if enabled
 * - Automatically creates output directory if it doesn't exist
 * - Exits with code 1 if flags directory doesn't exist
 */
export async function generateFlags(config: Config): Promise<void> {
  if (!existsSync(config.flagsDir)) {
    console.error(`❌ Flags directory not found: ${config.flagsDir}`);
    process.exit(1);
  }

  const files = await Array.fromAsync(new Bun.Glob('*.json').scan(config.flagsDir));

  if (files.length === 0) {
    console.log('⚠️  No flag files found');
    return;
  }

  const keys: string[] = [];
  const flagConfigs: FlagConfig[] = [];

  for (const file of files) {
    try {
      const content = readFileSync(join(config.flagsDir, file), 'utf8');
      const json: FlagConfig = JSON.parse(content);

      // Validate required fields
      if (!json.key || !json.name || json.active === undefined) {
        console.error(`❌ ${file}: missing required field (key, name, or active)`);
        continue;
      }

      keys.push(json.key);
      flagConfigs.push(json);
    } catch (error) {
      if (
        error instanceof Error &&
        (error.message.includes('EACCES') || (error as NodeJS.ErrnoException).code === 'EACCES')
      ) {
        console.error(`❌ Error reading ${file}: ${error.message}`);
      } else {
        console.error(
          `❌ Error parsing ${file}:`,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  const body = generateTypeScriptContent(keys, flagConfigs, config);

  // Ensure output directory exists
  const outputDir = config.outputFile.substring(0, config.outputFile.lastIndexOf('/'));
  if (outputDir && !existsSync(outputDir)) {
    await Bun.write(`${outputDir}/.gitkeep`, '');
  }

  await Bun.write(config.outputFile, body);
  console.log(`✓ Generated ${config.outputFile} (${keys.length} flags)`);
}

/**
 * Generates the TypeScript content for feature flags constants and types.
 *
 * @param keys - Array of feature flag keys
 * @param flagConfigs - Array of complete flag configuration objects
 * @param config - Configuration object with generation options
 * @returns Generated TypeScript code as a string
 *
 * @internal
 * This function is used internally by generateFlags and handles the actual code generation.
 */
function generateTypeScriptContent(
  keys: string[],
  flagConfigs: FlagConfig[],
  config: Config
): string {
  const convention = config.generation?.namingConvention || 'snake_case';

  const formatConstantName = (key: string): string => {
    if (!key || typeof key !== 'string') {
      throw new Error('Invalid key provided to formatConstantName');
    }
    switch (convention) {
      case 'camelCase':
        return key.replace(/[-\s]/g, '').replace(/^\w/, (c) => c.toLowerCase());
      case 'SCREAMING_SNAKE_CASE':
        return key.replace(/[-\s]/g, '_').toUpperCase();
      default:
        return key.replace(/[-\s]/g, '_');
    }
  };

  return `/**
 * 🚨 AUTO-GENERATED — do not modify by hand
 * Run \`hogsync generate\` to refresh.
 */

export const FeatureFlags = {
${keys.map((k) => `  ${formatConstantName(k)}: '${k}',`).join('\n')}
} as const;

export type FeatureFlag = typeof FeatureFlags[keyof typeof FeatureFlags];

${
  config.generation?.includeLocalConfigs
    ? `
export const LocalFeatureFlags = {
${flagConfigs
  .map(
    (flag) => `  ${formatConstantName(flag.key)}: {
    key: '${flag.key}',
    name: '${flag.name}',
    enabled: ${flag.active},
  },`
  )
  .join('\n')}
} as const;

export type LocalFeatureFlagConfig = {
  key: string;
  name: string;
  enabled: boolean;
};
`
    : ''
}`;
}
