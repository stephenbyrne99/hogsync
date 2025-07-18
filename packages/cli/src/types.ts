/**
 * @fileoverview Type definitions for Hogsync configuration and PostHog feature flag structures.
 */

/**
 * PostHog feature flag filter group configuration.
 * Defines targeting rules for feature flag rollouts.
 */
interface FilterGroup {
  /** Property-based targeting conditions */
  properties?: Array<{
    /** Property key to match against */
    key: string;
    /** Value to match (supports multiple types) */
    value: string | number | boolean | string[];
    /** Comparison operator (exact, icontains, etc.) */
    operator?: string;
    /** Property type (person, event, or group) */
    type?: 'person' | 'event' | 'group';
  }>;
  /** Percentage of users to include (0-100) */
  rollout_percentage?: number;
  /** Specific variant to serve for this group */
  variant?: string;
}

/**
 * PostHog feature flag variant configuration.
 * Used for multivariate testing and gradual rollouts.
 */
interface FlagVariant {
  /** Unique identifier for the variant */
  key: string;
  /** Human-readable name for the variant */
  name?: string;
  /** Percentage of users to receive this variant (0-100) */
  rollout_percentage: number;
}

/**
 * Feature flag configuration structure matching PostHog's API format.
 * This represents a single feature flag definition from a JSON file.
 *
 * @example
 * ```json
 * {
 *   "key": "dark-mode",
 *   "name": "Dark Mode Toggle",
 *   "active": true,
 *   "description": "Enable dark theme for the application",
 *   "filters": {
 *     "groups": [
 *       {
 *         "rollout_percentage": 50
 *       }
 *     ]
 *   }
 * }
 * ```
 */
export interface FlagConfig {
  /** Unique identifier for the feature flag (kebab-case recommended) */
  key: string;
  /** Human-readable name for the feature flag */
  name: string;
  /** Whether the feature flag is active/enabled */
  active: boolean;
  /** Targeting and rollout configuration */
  filters?: {
    /** Array of targeting groups */
    groups?: FilterGroup[];
    /** Multivariate testing configuration */
    multivariate?: {
      /** Available variants for testing */
      variants: FlagVariant[];
    };
    /** Custom payloads for variants */
    payloads?: Record<string, unknown>;
  };
  /** Optional description of the feature flag's purpose */
  description?: string;
  /** Whether to ensure consistent user experience across sessions */
  ensure_experience_continues?: boolean;
  /** Available variants (alternative to multivariate.variants) */
  variants?: FlagVariant[];
}

/**
 * Main configuration object for Hogsync.
 * Defines how feature flags are processed, generated, and synchronized.
 *
 * @example
 * ```javascript
 * module.exports = {
 *   flagsDir: 'feature-flags',
 *   outputFile: 'src/generated/feature-flags.ts',
 *   posthog: {
 *     host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
 *     projectId: process.env.POSTHOG_PROJECT_ID,
 *     apiToken: process.env.POSTHOG_API_TOKEN,
 *   },
 *   generation: {
 *     includeLocalConfigs: true,
 *     namingConvention: 'snake_case',
 *   }
 * };
 * ```
 */
export interface Config {
  /** Directory containing feature flag JSON files */
  flagsDir: string;
  /** Output path for generated TypeScript file */
  outputFile: string;
  /** PostHog API configuration */
  posthog: {
    /** PostHog instance URL */
    host: string;
    /** PostHog project identifier */
    projectId: string;
    /** PostHog API authentication token */
    apiToken: string;
  };
  /** TypeScript generation options */
  generation?: {
    /** Whether to include local development configurations */
    includeLocalConfigs?: boolean;
    /** Naming convention for generated constants */
    namingConvention?: 'camelCase' | 'snake_case' | 'SCREAMING_SNAKE_CASE';
    /** Whether to generate React template code (deprecated) */
    generateReactTemplate?: boolean;
  };
}
