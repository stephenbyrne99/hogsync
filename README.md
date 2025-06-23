# Hogsync

Type-safe PostHog feature flags with automated sync and local development overrides.

## Features

- 🚀 **Zero dependencies** - Standalone binary created with Bun
- 🔄 **Bi-directional sync** - Generate TypeScript from JSON, sync to PostHog
- 🎯 **Type safety** - Full TypeScript support with generated types
- 🔧 **Local development** - Override flags locally without touching PostHog
- ⚡ **GitHub Action** - Automated CI/CD integration

## Quick Start

### Installation

```bash
# As a dev dependency
npm install --save-dev hogsync 

# Or install globally
npm install -g hogsync

# Or use without installation
npx hogsync init
```

### Initialize Configuration

```bash
hogsync init
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

### Next.js

```typescript
import { useFeatureFlagEnabled as usePostHogFeatureFlagEnabled } from "posthog-js/react";
import { LocalFeatureFlags } from "hogsync/feature-flags";
import { createNextJSFeatureFlags } from "hogsync/react";

// Works in both pages/ and app/ directory
const {
  useFeatureFlagEnabled,
  getLocalFeatureFlagConfig,
} = createNextJSFeatureFlags(usePostHogFeatureFlagEnabled, LocalFeatureFlags);

export default function HomePage() {
  const isDarkModeEnabled = useFeatureFlagEnabled('dark-mode');
  
  return (
    <div>
      <h1>Welcome</h1>
      {isDarkModeEnabled && <DarkModeLayout />}
    </div>
  );
}
```

### Vite

```typescript
import { useFeatureFlagEnabled as usePostHogFeatureFlagEnabled } from "posthog-js/react";
import { LocalFeatureFlags } from "hogsync/feature-flags";
import { createViteFeatureFlags } from "hogsync/react";

const {
  useFeatureFlagEnabled,
} = createViteFeatureFlags(usePostHogFeatureFlagEnabled, LocalFeatureFlags);

export function App() {
  const isDarkModeEnabled = useFeatureFlagEnabled('dark-mode');
  
  return (
    <div className={isDarkModeEnabled ? 'dark' : 'light'}>
      <h1>Vite + React App</h1>
    </div>
  );
}
```

### Create React App

```typescript
import { useFeatureFlagEnabled as usePostHogFeatureFlagEnabled } from "posthog-js/react";
import { LocalFeatureFlags } from "hogsync/feature-flags";
import { createCRAFeatureFlags } from "hogsync/react";

const {
  useFeatureFlagEnabled,
} = createCRAFeatureFlags(usePostHogFeatureFlagEnabled, LocalFeatureFlags);

export function App() {
  const isDarkModeEnabled = useFeatureFlagEnabled('dark-mode');
  
  return (
    <div className="App">
      <header className={isDarkModeEnabled ? 'dark-header' : 'light-header'}>
        <h1>Create React App</h1>
      </header>
    </div>
  );
}
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
        with:
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
        uses: your-username/hogsync@v1
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
const hooks = createFeatureFlags(usePostHogFeatureFlagEnabled, LocalFeatureFlags, {
  isDevelopment: window.location.hostname.includes('staging'),
  debug: false, // Disable logging
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
const testHooks = createFeatureFlags(mockPostHogHook, LocalFeatureFlags, {
  isDevelopment: true, // Always use local flags
  debug: false
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
