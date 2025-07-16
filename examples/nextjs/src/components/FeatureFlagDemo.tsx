'use client';

import { createFeatureFlags } from 'hogsync/react';
import { useFeatureFlagEnabled as usePostHogFeatureFlagEnabled } from 'posthog-js/react';
import { FeatureFlags, LocalFeatureFlags } from '@/generated/feature-flags';

// Create feature flag hooks using hogsync
const { useFeatureFlagEnabled } = createFeatureFlags(
  usePostHogFeatureFlagEnabled,
  LocalFeatureFlags
);

export default function FeatureFlagDemo() {
  const isDarkModeEnabled = useFeatureFlagEnabled(FeatureFlags.dark_mode);
  const isAiChatEnabled = useFeatureFlagEnabled(FeatureFlags.ai_chat);
  const isAiSummariesEnabled = useFeatureFlagEnabled(FeatureFlags.ai_summaries);
  const isNotificationsEnabled = useFeatureFlagEnabled(FeatureFlags.notifications);

  return (
    <div className="p-6 border rounded-lg bg-gray-50 dark:bg-gray-800">
      <h2 className="text-xl font-bold mb-4">HogSync Feature Flags Demo</h2>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${isDarkModeEnabled ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span>Dark Mode: {isDarkModeEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${isAiChatEnabled ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span>AI Chat: {isAiChatEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${isAiSummariesEnabled ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span>AI Summaries: {isAiSummariesEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${isNotificationsEnabled ? 'bg-green-500' : 'bg-red-500'}`}
          />
          <span>Notifications: {isNotificationsEnabled ? 'Enabled' : 'Disabled'}</span>
        </div>
      </div>

      {isAiSummariesEnabled && (
        <div className="mt-4 p-3 bg-blue-100 dark:bg-blue-900 rounded">
          <p className="text-sm">
            🤖 AI Summaries feature is enabled! This content is only shown when the feature flag is
            on.
          </p>
        </div>
      )}
    </div>
  );
}
