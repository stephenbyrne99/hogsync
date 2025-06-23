// Main library exports for npm package
export { loadConfig } from './config';
export { generateFlags } from './generator';
// Re-export React hooks for library usage
export * from './react-hooks';
export { syncFlags } from './sync';
export type { Config, FlagConfig } from './types';
