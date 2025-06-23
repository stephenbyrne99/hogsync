export interface FlagConfig {
  key: string;
  name: string;
  active: boolean;
  filters?: any;
  description?: string;
  ensure_experience_continues?: boolean;
  variants?: any[];
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
