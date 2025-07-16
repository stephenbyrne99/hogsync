'use client';

import posthog from 'posthog-js';
import { PostHogProvider } from 'posthog-js/react';
import { useEffect } from 'react';

export default function PHProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize PostHog with a dummy key for demo purposes
    // In a real app, you'd use your actual PostHog project key
    posthog.init('phc-demo-key', {
      api_host: 'https://app.posthog.com',
      // Disable in development to avoid sending test data
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug();
      },
    });
  }, []);

  return <PostHogProvider client={posthog}>{children}</PostHogProvider>;
}
