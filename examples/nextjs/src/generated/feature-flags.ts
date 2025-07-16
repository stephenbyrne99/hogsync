/**
 * 🚨 AUTO-GENERATED — do not modify by hand
 * Run `hogsync generate` to refresh.
 */

export const FeatureFlags = {
  dark_mode: 'dark-mode',
  notifications: 'notifications',
  ai_chat: 'ai-chat',
  ai_summaries: 'ai-summaries',
  integrations: 'integrations',
} as const;

export type FeatureFlag = (typeof FeatureFlags)[keyof typeof FeatureFlags];

export const LocalFeatureFlags = {
  dark_mode: {
    key: 'dark-mode',
    name: 'Dark Mode Toggle',
    enabled: false,
  },
  notifications: {
    key: 'notifications',
    name: 'Push Notifications',
    enabled: false,
  },
  ai_chat: {
    key: 'ai-chat',
    name: 'AI Chat Widget',
    enabled: false,
  },
  ai_summaries: {
    key: 'ai-summaries',
    name: 'AI Summaries',
    enabled: true,
  },
  integrations: {
    key: 'integrations',
    name: 'Integrations',
    enabled: false,
  },
} as const;

export type LocalFeatureFlagConfig = {
  key: string;
  name: string;
  enabled: boolean;
};
