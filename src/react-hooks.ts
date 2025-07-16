/**
 * React hooks for PostHog feature flags with local development overrides
 * This is an optional utility that requires React and posthog-js/react
 */

import type { FeatureFlag, LocalFeatureFlagConfig } from './generated/feature-flags';

// Type-only imports to avoid runtime dependencies
type UseFeatureFlagEnabledHook = (flag: string) => boolean | undefined;

// Re-export types for convenience
export type { FeatureFlag, LocalFeatureFlagConfig };

/**
 * Auto-detect development mode across different React frameworks
 */
function detectDevelopmentMode(): boolean {
  // Vite
  if (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env) {
    const env = (globalThis as any).import.meta.env;
    return env.DEV === 'true' || env.MODE === 'development';
  }

  // Next.js (client-side)
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_NODE_ENV) {
    return process.env.NEXT_PUBLIC_NODE_ENV === 'development';
  }

  // Node.js environments (Next.js server-side, CRA, etc.)
  if (typeof process !== 'undefined' && process.env.NODE_ENV) {
    return process.env.NODE_ENV === 'development';
  }

  // Browser-based detection fallbacks
  if (typeof window !== 'undefined') {
    // Check for common development indicators
    return (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.includes('.local') ||
      window.location.port !== '' // Development servers usually run on ports
    );
  }

  // Default to false if we can't detect
  return false;
}

/**
 * Enhanced feature flag hook that respects local development overrides
 * @param flag - The feature flag key
 * @param usePostHogFeatureFlagEnabled - The PostHog React hook (pass this in to avoid hard dependency)
 * @param LocalFeatureFlags - The generated local feature flags object
 * @param isDevelopment - Whether we're in development mode (auto-detects if not provided)
 * @param debug - Whether to log debug information
 */
export function createUseFeatureFlagEnabled(
  usePostHogFeatureFlagEnabled: UseFeatureFlagEnabledHook,
  LocalFeatureFlags: Record<string, LocalFeatureFlagConfig>,
  isDevelopment?: boolean,
  debug = true
) {
  return function useFeatureFlagEnabled(flag: FeatureFlag): boolean {
    const posthogEnabled = usePostHogFeatureFlagEnabled(flag);

    const isDevMode = isDevelopment ?? detectDevelopmentMode();

    if (isDevMode) {
      const flagKey = flag.replace(/-/g, '_') as keyof typeof LocalFeatureFlags;
      const localConfig = LocalFeatureFlags[flagKey];

      if (debug && typeof console !== 'undefined') {
        console.log(`[Feature Flag Debug] ${flag}:`, {
          framework: getFrameworkInfo(),
          isDevelopment: isDevMode,
          flagKey,
          localConfig,
          enabled: localConfig?.enabled,
          posthogEnabled,
        });
      }

      return localConfig?.enabled ?? false;
    }

    return posthogEnabled ?? false;
  };
}

/**
 * Get information about the current framework/environment
 */
function getFrameworkInfo(): string {
  if (typeof globalThis !== 'undefined' && (globalThis as any).import?.meta?.env) {
    return 'vite';
  }
  if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_NODE_ENV) {
    return 'next.js';
  }
  if (typeof process !== 'undefined' && process.env.REACT_APP_NODE_ENV) {
    return 'create-react-app';
  }
  if (typeof window !== 'undefined') {
    return 'browser';
  }
  return 'unknown';
}

/**
 * Get local feature flag configuration for a given flag
 * @param flag - The feature flag key
 * @param LocalFeatureFlags - The generated local feature flags object
 */
export function createGetLocalFeatureFlagConfig(
  LocalFeatureFlags: Record<string, LocalFeatureFlagConfig>
) {
  return function getLocalFeatureFlagConfig(flag: FeatureFlag): LocalFeatureFlagConfig | undefined {
    const flagKey = flag.replace(/-/g, '_') as keyof typeof LocalFeatureFlags;
    return LocalFeatureFlags[flagKey];
  };
}

/**
 * Universal feature flags factory that works with any React setup
 * Auto-detects the framework and development environment
 * @param usePostHogFeatureFlagEnabled - The PostHog React hook
 * @param LocalFeatureFlags - The generated local feature flags object
 * @param options - Configuration options
 */
export function createFeatureFlags(
  usePostHogFeatureFlagEnabled: UseFeatureFlagEnabledHook,
  LocalFeatureFlags: Record<string, LocalFeatureFlagConfig>,
  options: {
    isDevelopment?: boolean;
    debug?: boolean;
  } = {}
) {
  const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
    usePostHogFeatureFlagEnabled,
    LocalFeatureFlags,
    options.isDevelopment,
    options.debug ?? true
  );

  const getLocalFeatureFlagConfig = createGetLocalFeatureFlagConfig(LocalFeatureFlags);

  return {
    useFeatureFlagEnabled,
    getLocalFeatureFlagConfig,
    LocalFeatureFlags,
  };
}
