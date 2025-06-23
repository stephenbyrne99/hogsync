#!/usr/bin/env node

/**
 * Sync feature flags from local JSON files to PostHog
 * Uses PostHog API to create/update feature flags
 */

const fs = require('node:fs');
const path = require('node:path');

const FLAGS_DIR = 'feature-flags';
const POSTHOG_HOST = process.env.POSTHOG_CLI_HOST || 'https://app.posthog.com';
const PROJECT_ID = process.env.POSTHOG_CLI_ENV_ID;
const API_TOKEN = process.env.POSTHOG_CLI_TOKEN;

if (!PROJECT_ID || !API_TOKEN) {
  console.error(
    'Error: POSTHOG_CLI_ENV_ID and POSTHOG_CLI_TOKEN environment variables are required'
  );
  process.exit(1);
}

async function syncFeatureFlags() {
  try {
    const flagFiles = fs.readdirSync(FLAGS_DIR).filter((f) => f.endsWith('.json'));

    console.log(`Found ${flagFiles.length} feature flag files to sync`);
    console.log(`Using PostHog Host: ${POSTHOG_HOST}`);
    console.log(`Using Project ID: ${PROJECT_ID}`);

    for (const file of flagFiles) {
      const flagData = JSON.parse(fs.readFileSync(path.join(FLAGS_DIR, file), 'utf8'));
      console.log(`\nProcessing flag: ${flagData.key}`);

      // Check if flag exists
      const existingFlag = await getFeatureFlag(flagData.key);

      if (existingFlag) {
        console.log(`Found existing flag: ${flagData.key} (ID: ${existingFlag.id})`);
        console.log(`Updating existing flag: ${flagData.key}`);
        const _result = await updateFeatureFlag(flagData);
        console.log(`✓ Updated flag: ${flagData.key}`);
      } else {
        console.log(`Flag not found, creating new flag: ${flagData.key}`);
        const result = await createFeatureFlag(flagData);
        console.log(`✓ Created flag: ${flagData.key} (ID: ${result.id})`);
      }
    }

    console.log('\n✓ Feature flags sync completed successfully');
  } catch (error) {
    console.error('Error syncing feature flags:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Cache all flags to avoid repeated API calls
let allFlags = null;

async function getAllFeatureFlags() {
  if (allFlags) return allFlags;

  const url = `${POSTHOG_HOST}/api/projects/${PROJECT_ID}/feature_flags/`;
  console.log(`Fetching all flags from: ${url}`);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
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
  allFlags = data.results;
  return allFlags;
}

async function getFeatureFlag(key) {
  console.log(`Looking for flag with key: ${key}`);

  const flags = await getAllFeatureFlags();
  const flag = flags.find((f) => f.key === key);

  if (flag) {
    console.log(`Found existing flag: ${key} (ID: ${flag.id})`);
  } else {
    console.log(`Flag ${key} not found`);
  }

  return flag || null;
}

async function createFeatureFlag(flagData) {
  const response = await fetch(`${POSTHOG_HOST}/api/projects/${PROJECT_ID}/feature_flags/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_TOKEN}`,
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

async function updateFeatureFlag(flagData) {
  const existingFlag = await getFeatureFlag(flagData.key);

  const response = await fetch(
    `${POSTHOG_HOST}/api/projects/${PROJECT_ID}/feature_flags/${existingFlag.id}/`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
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
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to update feature flag: ${response.status} ${response.statusText} - ${errorText}`
    );
  }

  return response.json();
}

syncFeatureFlags();
