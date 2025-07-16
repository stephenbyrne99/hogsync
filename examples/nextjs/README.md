# HogSync Next.js Example

This is a Next.js example demonstrating how to use HogSync for type-safe PostHog feature flags.

## Features Demonstrated

- Integration with Next.js App Router
- Type-safe feature flag usage with React hooks
- Local development with feature flag overrides
- PostHog integration for production

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) to see the example.

## How It Works

The example shows:

1. **Feature Flag Setup**: Uses `createFeatureFlags` from `hogsync/react` to create type-safe hooks
2. **Local Development**: Feature flags use local configuration during development
3. **PostHog Integration**: In production, flags would be fetched from PostHog
4. **React Components**: Demonstrates conditional rendering based on feature flags

## Key Files

- `src/components/FeatureFlagDemo.tsx` - Main demo component showing feature flag usage
- `src/components/PostHogProvider.tsx` - PostHog provider setup
- `src/app/layout.tsx` - App layout with PostHog provider
- `src/app/page.tsx` - Main page including the demo

## Feature Flags Used

The example uses these feature flags defined in the parent hogsync project:

- `dark-mode` - Dark mode toggle
- `ai-chat` - AI chat feature
- `ai-summaries` - AI summaries feature (enabled by default)
- `integrations` - Integrations feature

## Production Usage

In a real application, you would:

1. Replace the dummy PostHog key with your actual project key
2. Configure proper PostHog settings for your environment
3. Use the HogSync CLI to sync feature flags from PostHog

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
