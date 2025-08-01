#!/usr/bin/env bun

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config';
import { generateFlags } from './generator';
import { syncFlags } from './sync';
import { validateDirectoryPath, validateFlagSchema, validatePath } from './validation';

const args = process.argv.slice(2);
const command = args[0];

const version = '1.0.0';

function showHelp() {
  console.log(`
HogSync 

USAGE:
  hogsync <command> [options]

COMMANDS:
  init           Initialize configuration file
  generate       Generate TypeScript from flag definitions
  sync           Sync flags to PostHog
  watch          Watch for changes and auto-generate
  validate       Validate flag definitions
  help           Show this help message

OPTIONS:
  -c, --config   Config file path (default: hogsync.config.js)
  -v, --version  Show version
  -h, --help     Show help

EXAMPLES:
  hogsync init
  hogsync generate
  hogsync sync
  hogsync generate --config my-config.js
`);
}

function showVersion() {
  console.log(version);
}

async function initConfig() {
  const configPath = 'hogsync.config.js';

  if (existsSync(configPath)) {
    console.log('⚠️  Configuration file already exists:', configPath);
    return;
  }

  const defaultConfig = `module.exports = {
  // Directory containing feature flag JSON files
  flagsDir: 'feature-flags',
  
  // Output file for generated TypeScript
  outputFile: 'src/generated/feature-flags.ts',
  
  // PostHog configuration
  posthog: {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    projectId: process.env.POSTHOG_PROJECT_ID,
    apiToken: process.env.POSTHOG_API_TOKEN,
  },
  
  // Generation options
  generation: {
    // Whether to generate local configs
    includeLocalConfigs: true,
    
    // Naming convention for constants (camelCase, snake_case, SCREAMING_SNAKE_CASE)
    namingConvention: 'snake_case',
  }
};`;

  await Bun.write(configPath, defaultConfig);
  console.log('✓ Created configuration file:', configPath);
  console.log('📝 Edit the file to customize your settings');
}

function getConfigPath(): string {
  const configIndex = args.findIndex((arg) => arg === '-c' || arg === '--config');
  const configPath =
    configIndex !== -1 && args[configIndex + 1] ? args[configIndex + 1] : 'hogsync.config.js';

  // Validate config path for security
  try {
    return validatePath(configPath);
  } catch (error) {
    console.error(
      `❌ Invalid config path: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}

async function handleGenerate() {
  const configPath = getConfigPath();
  const config = await loadConfig(configPath);
  await generateFlags(config);
}

async function handleSync() {
  const configPath = getConfigPath();
  const config = await loadConfig(configPath);
  await syncFlags(config);
}

async function handleValidate() {
  const configPath = getConfigPath();
  const config = await loadConfig(configPath);

  // Validate flags directory path
  const safeFlagsDir = validateDirectoryPath(config.flagsDir);

  if (!existsSync(safeFlagsDir)) {
    console.error(`❌ Flags directory not found: ${config.flagsDir}`);
    process.exit(1);
  }

  const files = await Array.fromAsync(new Bun.Glob('*.json').scan(safeFlagsDir));

  console.log(`Validating ${files.length} flag files...`);

  let hasErrors = false;

  for (const file of files) {
    try {
      const filePath = join(safeFlagsDir, file);
      const content = readFileSync(filePath, 'utf8');
      const flag = JSON.parse(content);

      // Use comprehensive schema validation
      validateFlagSchema(flag, file);
      console.log(`✓ ${file}: Valid`);
    } catch (error) {
      console.error(`❌ ${file}: ${error instanceof Error ? error.message : String(error)}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n❌ Validation failed');
    process.exit(1);
  } else {
    console.log('\n✓ All flags are valid');
  }
}

async function main() {
  if (args.includes('-h') || args.includes('--help') || command === 'help') {
    showHelp();
    return;
  }

  if (args.includes('-v') || args.includes('--version')) {
    showVersion();
    return;
  }

  switch (command) {
    case 'init':
      await initConfig();
      break;
    case 'generate':
      await handleGenerate();
      break;
    case 'sync':
      await handleSync();
      break;
    case 'validate':
      await handleValidate();
      break;
    case 'watch':
      // TODO: Implement watch functionality
      console.log('Watch functionality coming soon...');
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
