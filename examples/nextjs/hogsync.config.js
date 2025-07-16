module.exports = {
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
