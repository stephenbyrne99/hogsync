# Hogsync

NOTE: Unofficial package with no association to PostHog team.

Type-safe PostHog feature flags with automated sync and local development overrides.

## Features

- 🔄 **Bi-directional sync** - Generate TypeScript from JSON, sync to PostHog
- 🎯 **Type safety** - Full TypeScript support with generated types
- 🔧 **Local development** - Override flags locally without touching PostHog
- ⚡ **GitHub Action** - Automated CI/CD integration

## Quick Start

### Initialize Configuration

```bash
npx hogsync init
```

This creates a `hogsync.config.js` file:

```javascript
module.exports = {
  // Directory containing feature flag JSON files
  flagsDir: 'feature-flags',
  
  // Output file for generated TypeScript
  outputFile: 'src/generated/feature-flags.ts',
  
  // PostHog configuration
  posthog: {
    host: process.env.POSTHOG_HOST || 'https://app.posthog.com',
    projectId: process.env.POSTHOG_PROJECT_ID,
    apiToken: process.env.POSTHOG_API_TOKEN,
  },
  
  // Generation options
  generation: {
    includeLocalConfigs: true,
    namingConvention: 'snake_case', // 'camelCase', 'snake_case', 'SCREAMING_SNAKE_CASE'
  }
};
```

### Create Feature Flag Files

Create JSON files in your `feature-flags/` directory:

```json
// feature-flags/dark-mode.flag.json
{
  "key": "dark-mode",
  "name": "Dark Mode Toggle",
  "active": true,
  "description": "Enable dark mode theme",
  "filters": {
    "groups": [
      {
        "properties": [
          {
            "key": "email",
            "operator": "icontains",
            "value": "@company.com"
          }
        ]
      }
    ]
  }
}
```

### Generate TypeScript

```bash
hogsync generate
```

This generates type-safe constants:

```typescript
// src/generated/feature-flags.ts
export const FeatureFlags = {
  dark_mode: 'dark-mode',
  ai_chat: 'ai-chat',
} as const;

export type FeatureFlag = typeof FeatureFlags[keyof typeof FeatureFlags];

export const LocalFeatureFlags = {
  dark_mode: {
    key: 'dark-mode',
    name: 'Dark Mode Toggle',
    enabled: true,
  },
} as const;
```

### Sync to PostHog

```bash
# Set environment variables
export POSTHOG_PROJECT_ID="your-project-id"
export POSTHOG_API_TOKEN="your-api-token"

# Sync flags to PostHog
hogsync sync
```

## Framework Usage

### Universal (Auto-detects framework)

The `createFeatureFlags` function automatically detects your framework and environment:

```typescript
import { useFeatureFlagEnabled as usePostHogFeatureFlagEnabled } from "posthog-js/react";
import { LocalFeatureFlags } from "hogsync/feature-flags";
import { createFeatureFlags } from "hogsync/react";

const {
  useFeatureFlagEnabled,
  getLocalFeatureFlagConfig,
} = createFeatureFlags(usePostHogFeatureFlagEnabled, LocalFeatureFlags);

export function MyComponent() {
  const isDarkModeEnabled = useFeatureFlagEnabled('dark-mode');
  const isNewFeatureEnabled = useFeatureFlagEnabled('new-feature');
  
  return (
    <div className={isDarkModeEnabled ? 'dark' : 'light'}>
      {isNewFeatureEnabled && <NewFeatureComponent />}
    </div>
  );
}
```

**Supported frameworks** (auto-detected):

- **Next.js** - Detects `process.env.NODE_ENV` and `NEXT_PUBLIC_NODE_ENV`
- **Vite** - Detects `import.meta.env.DEV` and `import.meta.env.MODE`
- **Create React App** - Detects `process.env.NODE_ENV`
- **Browser environments** - Falls back to hostname-based detection

### Manual Configuration

For custom environments or testing:

```typescript
const {
  useFeatureFlagEnabled,
  getLocalFeatureFlagConfig,
} = createFeatureFlags(usePostHogFeatureFlagEnabled, LocalFeatureFlags, {
  isDevelopment: window.location.hostname.includes('staging'),
  debug: false, // Disable debug logging
});
```

## GitHub Action

### Basic Usage

Create `.github/workflows/feature-flags.yml`:

```yaml
name: Sync Feature Flags

on:
  push:
    branches: [main, develop]
    paths: ['feature-flags/**']
  pull_request:
    branches: [main]
    paths: ['feature-flags/**']

jobs:
  sync-flags:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Sync PostHog Feature Flags
        uses: hogsync@v1
        with:
          posthog-project-id: ${{ secrets.POSTHOG_PROJECT_ID }}
          posthog-api-token: ${{ secrets.POSTHOG_API_TOKEN }}
```

### Advanced Configuration

```yaml
name: Feature Flags CI/CD

on:
  push:
    branches: [main]
    paths: ['feature-flags/**']

jobs:
  validate-and-sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      # Validate flags first
      - name: Validate Feature Flags
        uses: your-username/hogsync@v1
        wit:
          posthog-project-id: ${{ secrets.POSTHOG_PROJECT_ID }}
          posthog-api-token: ${{ secrets.POSTHOG_API_TOKEN }}
          generate-only: 'true'
          flags-dir: 'custom-flags'
          output-file: 'src/types/feature-flags.ts'
      
      # Commit generated types
      - name: Commit generated types
        run: |
          git config --local user.email "action@github.com"
          git config --local user.name "GitHub Action"
          git add src/types/feature-flags.ts
          git diff --staged --quiet || git commit -m "Update feature flag types"
          git push
      
      # Sync to PostHog only on main branch
      - name: Sync to PostHog
        if: github.ref == 'refs/heads/main'
        uses: hogsync@v1
        with:
          posthog-project-id: ${{ secrets.POSTHOG_PROJECT_ID }}
          posthog-api-token: ${{ secrets.POSTHOG_API_TOKEN }}
          posthog-host: ${{ secrets.POSTHOG_HOST }}
          sync-only: 'true'
```

### Action Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `posthog-project-id` | PostHog project ID | ✅ | - |
| `posthog-api-token` | PostHog API token | ✅ | - |
| `posthog-host` | PostHog host URL | ❌ | `https://app.posthog.com` |
| `flags-dir` | Directory containing flag JSON files | ❌ | `feature-flags` |
| `output-file` | Output file for TypeScript | ❌ | `src/generated/feature-flags.ts` |
| `config-file` | Path to configuration file | ❌ | `hogsync.config.js` |
| `sync-only` | Only sync, skip generation | ❌ | `false` |
| `generate-only` | Only generate, skip sync | ❌ | `false` |

### Repository Secrets

Set these in your repository settings:

- `POSTHOG_PROJECT_ID` - Your PostHog project ID
- `POSTHOG_API_TOKEN` - Your PostHog API token
- `POSTHOG_HOST` - (Optional) Custom PostHog host

## CLI Commands

```bash
# Initialize configuration
hogsync init

# Generate TypeScript from flags
hogsync generate

# Sync flags to PostHog
hogsync sync

# Validate flag definitions
hogsync validate

# Watch for changes (coming soon)
hogsync watch

# Show help
hogsync --help

# Show version
hogsync --version
```

## Development Workflow

### 1. Local Development

In development, feature flags use your local JSON configurations:

```typescript
// In development: uses LocalFeatureFlags (from JSON)
// In production: uses PostHog API
const isEnabled = useFeatureFlagEnabled('new-feature');
```

The hook automatically detects your environment and shows debug information:

```
[Feature Flag Debug] dark-mode: {
  framework: 'next.js',
  isDevelopment: true,
  flagKey: 'dark_mode',
  localConfig: { key: 'dark-mode', name: 'Dark Mode', enabled: true },
  enabled: true,
  posthogEnabled: undefined
}
```

**Framework Detection**:

- `vite` - Detected via `import.meta.env`
- `next.js` - Detected via `NEXT_PUBLIC_NODE_ENV`
- `create-react-app` - Detected via `REACT_APP_*` env vars
- `browser` - Fallback for browser environments
- `unknown` - When framework cannot be determined

### 2. Package.json Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "flags:generate": "hogsync generate",
    "flags:sync": "hogsync sync",
    "flags:validate": "hogsync validate",
    "dev": "npm run flags:generate && next dev"
  }
}
```

### 3. Development with Auto-Updates

For automatic flag generation during development, set up your scripts to regenerate flags before starting your dev server:

```json
{
  "scripts": {
    "dev": "bun run flags:generate && next dev --port 3001",
    "build": "bun run flags:generate && next build",
    "flags:generate": "hogsync generate",
    "flags:sync": "hogsync sync",
    "flags:validate": "hogsync validate",
    "start": "next start --port 3001",
    "lint": "next lint",
    "check-types": "tsc --noEmit",
    "format": "biome format --write ."
  }
}
```

This ensures your TypeScript types are always up-to-date when you start development or build your project.

### 3. Git Hooks

Pre-commit hook to validate flags:

```bash
#!/bin/sh
# .git/hooks/pre-commit
hogsync validate
```

## Advanced Configuration

### Custom Naming Conventions

```javascript
// hogsync.config.js
module.exports = {
  generation: {
    namingConvention: 'camelCase', // darkMode instead of dark_mode
  }
};
```

### Multiple Environments

```javascript
module.exports = {
  environments: {
    development: {
      posthog: { projectId: 'dev-project' }
    },
    production: {
      posthog: { projectId: 'prod-project' }
    }
  }
};
```

### Custom Development Detection

```typescript
// Override auto-detection for specific environments
const hooks = createFeatureFlags(usePostHogFeatureFlagEnabled, LocalFeatureFlags, {
  isDevelopment: window.location.hostname.includes('staging'),
  debug: false, // Disable logging
});

// Force development mode for testing
const testHooks = createFeatureFlags(usePostHogFeatureFlagEnabled, LocalFeatureFlags, {
  isDevelopment: true, // Always use local flags
  debug: false
});
```

## Best Practices

### 1. Flag Naming

Use kebab-case for flag keys:

```json
{
  "key": "new-checkout-flow",
  "name": "New Checkout Flow"
}
```

### 2. Gradual Rollouts

Use PostHog's percentage rollouts:

```json
{
  "key": "beta-feature",
  "active": true,
  "filters": {
    "groups": [
      {
        "rollout_percentage": 10
      }
    ]
  }
}
```

### 3. Feature Flag Cleanup

Remove flags after full rollout:

1. Set flag to 100% rollout
2. Remove conditional code
3. Delete flag JSON file
4. Run `hogsync generate`

### 4. Testing

Use manual overrides in tests:

```typescript
// Always use local flags in tests
const testHooks = createFeatureFlags(mockPostHogHook, LocalFeatureFlags, {
  isDevelopment: true, // Force local flags
  debug: false // Disable logging
});
```

## Migration from Existing Setup

If you have existing PostHog feature flags:

1. Export flags from PostHog
2. Create JSON files matching the structure
3. Run `hogsync generate`
4. Update your code to use the new hooks

## Troubleshooting

### Environment Detection Issues

If auto-detection fails, manually specify:

```typescript
// Manual override for edge cases
const hooks = createFeatureFlags(usePostHogFeatureFlagEnabled, LocalFeatureFlags, {
  isDevelopment: process.env.NODE_ENV === 'development'
});
```

### Build Issues

Ensure the React export is separate:

```typescript
// This works
import { LocalFeatureFlags } from "hogsync/feature-flags";
import { createFeatureFlags } from "hogsync/react";

// This might cause issues in non-React projects
import { createFeatureFlags } from "hogsync"; // Don't do this
```

```

## License

MIT - see LICENSE file for details.
