/**
 * @fileoverview Main library exports for the Hogsync npm package.
 *
 * Hogsync provides type-safe PostHog feature flags with automated sync and local development overrides.
 *
 * @example
 * ```typescript
 * import { loadConfig, generateFlags, syncFlags } from 'hogsync';
 *
 * const config = await loadConfig('hogsync.config.js');
 * await generateFlags(config);
 * await syncFlags(config);
 * ```
 */

/** Configuration loading utilities */
export { loadConfig } from './config';
/** Error types and error handling utilities */
export * from './errors';
/** TypeScript code generation utilities */
export { generateFlags } from './generator';
/** React hooks for feature flag integration */
export * from './react-hooks';
/** PostHog synchronization utilities */
export { syncFlags } from './sync';
/** Type definitions for configuration and flag structures */
export type { Config, FlagConfig } from './types';
