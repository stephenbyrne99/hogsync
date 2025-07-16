// PostHog feature flag filter types
interface FilterGroup {
  properties?: Array<{
    key: string;
    value: string | number | boolean | string[];
    operator?: string;
    type?: 'person' | 'event' | 'group';
  }>;
  rollout_percentage?: number;
  variant?: string;
}

interface FlagVariant {
  key: string;
  name?: string;
  rollout_percentage: number;
}

export interface FlagConfig {
  key: string;
  name: string;
  active: boolean;
  filters?: {
    groups?: FilterGroup[];
    multivariate?: {
      variants: FlagVariant[];
    };
    payloads?: Record<string, unknown>;
  };
  description?: string;
  ensure_experience_continues?: boolean;
  variants?: FlagVariant[];
}

export interface Config {
  flagsDir: string;
  outputFile: string;
  posthog: {
    host: string;
    projectId: string;
    apiToken: string;
  };
  generation?: {
    includeLocalConfigs?: boolean;
    namingConvention?: 'camelCase' | 'snake_case' | 'SCREAMING_SNAKE_CASE';
    generateReactTemplate?: boolean;
  };
}
