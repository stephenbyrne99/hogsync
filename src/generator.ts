import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config, FlagConfig } from './types';

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
      const json: FlagConfig = JSON.parse(readFileSync(join(config.flagsDir, file), 'utf8'));
      keys.push(json.key);
      flagConfigs.push(json);
    } catch (error) {
      console.error(
        `❌ Error parsing ${file}:`,
        error instanceof Error ? error.message : String(error)
      );
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

function generateTypeScriptContent(
  keys: string[],
  flagConfigs: FlagConfig[],
  config: Config
): string {
  const convention = config.generation?.namingConvention || 'snake_case';

  const formatConstantName = (key: string): string => {
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
