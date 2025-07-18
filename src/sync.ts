import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Config, FlagConfig } from './types';
import { validateDirectoryPath, validateFlagSchema } from './validation';

/**
 * Synchronizes local feature flag JSON files with PostHog.
 *
 * @param config - Configuration object containing PostHog credentials and flags directory
 * @returns Promise that resolves when synchronization is complete
 *
 * @example
 * ```typescript
 * const config = {
 *   flagsDir: 'feature-flags',
 *   posthog: {
 *     host: 'https://app.posthog.com',
 *     projectId: 'your-project-id',
 *     apiToken: 'your-api-token'
 *   }
 * };
 * await syncFlags(config);
 * ```
 *
 * @remarks
 * - Requires PostHog project ID and API token to be configured
 * - Creates new flags if they don't exist in PostHog
 * - Updates existing flags with local changes
 * - Preserves flag keys but updates all other properties
 * - Exits with code 1 on any error to ensure CI/CD pipeline failures are caught
 * - Caches all existing flags to minimize API calls
 */
export async function syncFlags(config: Config): Promise<void> {
  const { host, projectId, apiToken } = config.posthog;

  if (!projectId || !apiToken) {
    console.error('❌ PostHog project ID and API token are required');
    console.error('Set POSTHOG_PROJECT_ID and POSTHOG_API_TOKEN environment variables');
    process.exit(1);
  }

  // Validate flags directory path for security
  const safeFlagsDir = validateDirectoryPath(config.flagsDir);

  if (!existsSync(safeFlagsDir)) {
    console.error(`❌ Flags directory not found: ${config.flagsDir}`);
    process.exit(1);
  }

  const files = await Array.fromAsync(new Bun.Glob('*.json').scan(safeFlagsDir));

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
      const filePath = join(safeFlagsDir, file);
      const rawData = JSON.parse(readFileSync(filePath, 'utf8'));

      // Validate flag schema before syncing
      const flagData = validateFlagSchema(rawData, file);

      console.log(`\nProcessing flag: ${flagData.key}`);

      const existingFlag = allFlags.find(
        (f: { key: string; id: string }) => f.key === flagData.key
      );

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
      console.error(
        `❌ Error processing ${file}:`,
        error instanceof Error ? error.message : String(error)
      );
      process.exit(1);
    }
  }

  console.log('\n✓ Feature flags sync completed successfully');
}

/**
 * Fetches all feature flags from PostHog for the given project.
 *
 * @param host - PostHog host URL
 * @param projectId - PostHog project ID
 * @param apiToken - PostHog API token
 * @returns Promise that resolves to array of feature flag objects
 *
 * @internal
 * This function is used internally by syncFlags to cache existing flags.
 */
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

/**
 * Creates a new feature flag in PostHog.
 *
 * @param host - PostHog host URL
 * @param projectId - PostHog project ID
 * @param apiToken - PostHog API token
 * @param flagData - Feature flag configuration data
 * @returns Promise that resolves to the created flag object
 *
 * @internal
 * This function is used internally by syncFlags to create new flags.
 */
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

/**
 * Updates an existing feature flag in PostHog.
 *
 * @param host - PostHog host URL
 * @param projectId - PostHog project ID
 * @param apiToken - PostHog API token
 * @param flagId - PostHog flag ID to update
 * @param flagData - Feature flag configuration data
 * @returns Promise that resolves to the updated flag object
 *
 * @internal
 * This function is used internally by syncFlags to update existing flags.
 */
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
