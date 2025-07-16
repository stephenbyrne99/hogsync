import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import {
  createFeatureFlags,
  createGetLocalFeatureFlagConfig,
  createUseFeatureFlagEnabled,
  type LocalFeatureFlagConfig,
} from '../src/react-hooks';

// Type for test mocking of globalThis
type GlobalThisWithMocks = Record<string, unknown>;

// Mock PostHog hook
const mockUsePostHogFeatureFlagEnabled = mock((flag: string) => {
  // Simulate PostHog returning true for 'posthog-enabled' flag
  return flag === 'posthog-enabled' ? true : undefined;
});

// Mock local feature flags
const mockLocalFeatureFlags: Record<string, LocalFeatureFlagConfig> = {
  dark_mode: {
    key: 'dark-mode',
    name: 'Dark Mode',
    enabled: true,
  },
  new_feature: {
    key: 'new-feature',
    name: 'New Feature',
    enabled: false,
  },
  beta_feature: {
    key: 'beta-feature',
    name: 'Beta Feature',
    enabled: true,
  },
};

// Mock console.log to capture debug output
const originalConsoleLog = console.log;
let consoleOutput: string[] = [];

describe('React Hooks', () => {
  beforeEach(() => {
    mockUsePostHogFeatureFlagEnabled.mockClear();
    consoleOutput = [];
    console.log = mock((...args: unknown[]) => {
      consoleOutput.push(args.join(' '));
    });
  });

  afterEach(() => {
    console.log = originalConsoleLog;
    // Reset environment variables
    delete (globalThis as GlobalThisWithMocks).import;
    delete process.env.NODE_ENV;
    delete process.env.NEXT_PUBLIC_NODE_ENV;
    delete process.env.REACT_APP_NODE_ENV;
  });

  describe('createUseFeatureFlagEnabled', () => {
    test('should use local config in development mode', () => {
      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true, // Force development mode
        false // Disable debug logging
      );

      const result = useFeatureFlagEnabled('dark-mode');

      expect(result).toBe(true);
      expect(mockUsePostHogFeatureFlagEnabled).toHaveBeenCalledWith('dark-mode');
    });

    test('should use PostHog in production mode', () => {
      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        false, // Force production mode
        false // Disable debug logging
      );

      const result = useFeatureFlagEnabled('posthog-enabled');

      expect(result).toBe(true);
      expect(mockUsePostHogFeatureFlagEnabled).toHaveBeenCalledWith('posthog-enabled');
    });

    test('should return false for unknown flags in development', () => {
      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        false
      );

      const result = useFeatureFlagEnabled('unknown-flag');

      expect(result).toBe(false);
    });

    test('should return false for disabled local flags', () => {
      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        false
      );

      const result = useFeatureFlagEnabled('new-feature');

      expect(result).toBe(false);
    });

    test('should log debug information when enabled', () => {
      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        true // Enable debug logging
      );

      useFeatureFlagEnabled('dark-mode');

      expect(consoleOutput.length).toBeGreaterThan(0);
      expect(consoleOutput[0]).toContain('[Feature Flag Debug] dark-mode:');
      expect(consoleOutput[0]).toContain('isDevelopment: true');
      expect(consoleOutput[0]).toContain('enabled: true');
    });

    test('should handle kebab-case to snake_case conversion', () => {
      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        false
      );

      const result = useFeatureFlagEnabled('beta-feature');

      expect(result).toBe(true);
    });
  });

  describe('createGetLocalFeatureFlagConfig', () => {
    test('should return local config for existing flag', () => {
      const getLocalFeatureFlagConfig = createGetLocalFeatureFlagConfig(mockLocalFeatureFlags);

      const config = getLocalFeatureFlagConfig('dark-mode');

      expect(config).toEqual({
        key: 'dark-mode',
        name: 'Dark Mode',
        enabled: true,
      });
    });

    test('should return undefined for non-existent flag', () => {
      const getLocalFeatureFlagConfig = createGetLocalFeatureFlagConfig(mockLocalFeatureFlags);

      const config = getLocalFeatureFlagConfig('non-existent');

      expect(config).toBeUndefined();
    });

    test('should handle kebab-case to snake_case conversion', () => {
      const getLocalFeatureFlagConfig = createGetLocalFeatureFlagConfig(mockLocalFeatureFlags);

      const config = getLocalFeatureFlagConfig('new-feature');

      expect(config).toEqual({
        key: 'new-feature',
        name: 'New Feature',
        enabled: false,
      });
    });
  });

  describe('createFeatureFlags', () => {
    test('should return all hook functions', () => {
      const hooks = createFeatureFlags(mockUsePostHogFeatureFlagEnabled, mockLocalFeatureFlags);

      expect(hooks).toHaveProperty('useFeatureFlagEnabled');
      expect(hooks).toHaveProperty('getLocalFeatureFlagConfig');
      expect(hooks).toHaveProperty('LocalFeatureFlags');
      expect(typeof hooks.useFeatureFlagEnabled).toBe('function');
      expect(typeof hooks.getLocalFeatureFlagConfig).toBe('function');
    });

    test('should pass options to underlying hooks', () => {
      const hooks = createFeatureFlags(mockUsePostHogFeatureFlagEnabled, mockLocalFeatureFlags, {
        isDevelopment: true,
        debug: false,
      });

      const result = hooks.useFeatureFlagEnabled('dark-mode');

      expect(result).toBe(true);
      expect(consoleOutput.length).toBe(0); // Debug disabled
    });

    test('should use default options when none provided', () => {
      const hooks = createFeatureFlags(mockUsePostHogFeatureFlagEnabled, mockLocalFeatureFlags);

      // Should work without throwing
      expect(typeof hooks.useFeatureFlagEnabled).toBe('function');
    });
  });

  describe('development mode detection', () => {
    test('should detect Vite development mode', () => {
      // Mock Vite environment
      (globalThis as GlobalThisWithMocks).import = {
        meta: {
          env: {
            DEV: 'true',
            MODE: 'development',
          },
        },
      };

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        undefined, // Auto-detect
        false
      );

      const result = useFeatureFlagEnabled('dark-mode');

      expect(result).toBe(true); // Should use local config
    });

    test('should detect Next.js development mode', () => {
      process.env.NEXT_PUBLIC_NODE_ENV = 'development';

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        undefined, // Auto-detect
        false
      );

      const result = useFeatureFlagEnabled('dark-mode');

      expect(result).toBe(true); // Should use local config
    });

    test('should detect Node.js development mode', () => {
      process.env.NODE_ENV = 'development';

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        undefined, // Auto-detect
        false
      );

      const result = useFeatureFlagEnabled('dark-mode');

      expect(result).toBe(true); // Should use local config
    });

    test('should detect Create React App development mode', () => {
      process.env.REACT_APP_NODE_ENV = 'development';

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        undefined, // Auto-detect
        false
      );

      const result = useFeatureFlagEnabled('dark-mode');

      expect(result).toBe(true); // Should use local config
    });

    test('should detect browser development mode via localhost', () => {
      // Mock window object
      (globalThis as GlobalThisWithMocks).window = {
        location: {
          hostname: 'localhost',
          port: '3000',
        },
      };

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        undefined, // Auto-detect
        false
      );

      const result = useFeatureFlagEnabled('dark-mode');

      expect(result).toBe(true); // Should use local config

      // Clean up
      delete (globalThis as GlobalThisWithMocks).window;
    });

    test('should default to production mode when detection fails', () => {
      // Ensure no development indicators are present
      delete (globalThis as GlobalThisWithMocks).import;
      delete process.env.NODE_ENV;
      delete process.env.NEXT_PUBLIC_NODE_ENV;
      delete process.env.REACT_APP_NODE_ENV;

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        undefined, // Auto-detect
        false
      );

      const result = useFeatureFlagEnabled('posthog-enabled');

      expect(result).toBe(true); // Should use PostHog
    });
  });

  describe('framework detection', () => {
    test('should detect Vite framework', () => {
      (globalThis as GlobalThisWithMocks).import = {
        meta: {
          env: {},
        },
      };

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        true
      );

      useFeatureFlagEnabled('dark-mode');

      expect(consoleOutput[0]).toContain('framework: vite');

      delete (globalThis as GlobalThisWithMocks).import;
    });

    test('should detect Next.js framework', () => {
      process.env.NEXT_PUBLIC_NODE_ENV = 'development';

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        true
      );

      useFeatureFlagEnabled('dark-mode');

      expect(consoleOutput[0]).toContain('framework: next.js');
    });

    test('should detect Create React App framework', () => {
      process.env.REACT_APP_NODE_ENV = 'development';

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        true
      );

      useFeatureFlagEnabled('dark-mode');

      expect(consoleOutput[0]).toContain('framework: create-react-app');
    });

    test('should detect browser environment', () => {
      (globalThis as GlobalThisWithMocks).window = {};

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        true
      );

      useFeatureFlagEnabled('dark-mode');

      expect(consoleOutput[0]).toContain('framework: browser');

      delete (globalThis as GlobalThisWithMocks).window;
    });

    test('should default to unknown framework', () => {
      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        true
      );

      useFeatureFlagEnabled('dark-mode');

      expect(consoleOutput[0]).toContain('framework: unknown');
    });
  });

  describe('edge cases', () => {
    test('should handle undefined PostHog response', () => {
      const mockUndefinedPostHog = mock(() => undefined);

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUndefinedPostHog,
        mockLocalFeatureFlags,
        false, // Production mode
        false
      );

      const result = useFeatureFlagEnabled('unknown-flag');

      expect(result).toBe(false);
    });

    test('should handle empty local flags object', () => {
      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        {}, // Empty local flags
        true,
        false
      );

      const result = useFeatureFlagEnabled('any-flag');

      expect(result).toBe(false);
    });

    test('should handle console being undefined', () => {
      const originalConsole = console;
      (globalThis as GlobalThisWithMocks).console = undefined;

      const useFeatureFlagEnabled = createUseFeatureFlagEnabled(
        mockUsePostHogFeatureFlagEnabled,
        mockLocalFeatureFlags,
        true,
        true // Debug enabled but console undefined
      );

      // Should not throw
      expect(() => useFeatureFlagEnabled('dark-mode')).not.toThrow();

      (globalThis as GlobalThisWithMocks).console = originalConsole;
    });
  });
});
