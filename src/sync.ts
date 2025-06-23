import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config, FlagConfig } from './types';

export async function syncFlags(config: Config): Promise<void> {
  const { host, projectId, apiToken } = config.posthog;

  if (!projectId || !apiToken) {
    console.error('❌ PostHog project ID and API token are required');
    console.error('Set POSTHOG_PROJECT_ID and POSTHOG_API_TOKEN environment variables');
    process.exit(1);
  }

  if (!existsSync(config.flagsDir)) {
    console.error(`❌ Flags directory not found: ${config.flagsDir}`);
    process.exit(1);
  }

  const files = await Array.fromAsync(new Bun.Glob('*.json').scan(config.flagsDir));

  if (files.length === 0) {
    console.log('⚠️  No flag files found to sync');
    return;
  }

  console.log(`Found ${files.length} feature flag files to sync`);
  console.log(`Using PostHog Host: ${host}`);
  console.log(`Using Project ID: ${projectId}`);

  // Cache all flags to avoid repeated API calls
  const allFlags = await getAllFeatureFlags(host, projectId, apiToken);

  for (const file of files) {
    try {
      const flagData: FlagConfig = JSON.parse(readFileSync(join(config.flagsDir, file), 'utf8'));

      console.log(`\nProcessing flag: ${flagData.key}`);

      const existingFlag = allFlags.find((f) => f.key === flagData.key);

      if (existingFlag) {
        console.log(`Found existing flag: ${flagData.key} (ID: ${existingFlag.id})`);
        await updateFeatureFlag(host, projectId, apiToken, existingFlag.id, flagData);
        console.log(`✓ Updated flag: ${flagData.key}`);
      } else {
        console.log(`Flag not found, creating new flag: ${flagData.key}`);
        const result = await createFeatureFlag(host, projectId, apiToken, flagData);
        console.log(`✓ Created flag: ${flagData.key} (ID: ${result.id})`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${file}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n✓ Feature flags sync completed successfully');
}

async function getAllFeatureFlags(host: string, projectId: string, apiToken: string) {
  const url = `${host}/api/projects/${projectId}/feature_flags/`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to fetch feature flags: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  const data = await response.json();
  return data.results;
}

async function createFeatureFlag(
  host: string,
  projectId: string,
  apiToken: string,
  flagData: FlagConfig
) {
  const response = await fetch(`${host}/api/projects/${projectId}/feature_flags/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      key: flagData.key,
      name: flagData.name,
      active: flagData.active,
      filters: flagData.filters || {},
      description: flagData.description || '',
      ensure_experience_continues: flagData.ensure_experience_continues || false,
      variants: flagData.variants || [],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to create feature flag: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}

async function updateFeatureFlag(
  host: string,
  projectId: string,
  apiToken: string,
  flagId: string,
  flagData: FlagConfig
) {
  const response = await fetch(`${host}/api/projects/${projectId}/feature_flags/${flagId}/`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: flagData.name,
      active: flagData.active,
      filters: flagData.filters || {},
      description: flagData.description || '',
      ensure_experience_continues: flagData.ensure_experience_continues || false,
      variants: flagData.variants || [],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update feature flag: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}
