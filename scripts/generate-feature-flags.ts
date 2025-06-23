// scripts/generate-feature-flags.ts
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

const FLAGS_DIR = 'feature-flags';
const OUT_FILE = 'src/generated/feature-flags.ts';

interface FlagConfig {
  key: string;
  name: string;
  active: boolean;
  filters?: any;
  description?: string;
  ensure_experience_continues?: boolean;
  variants?: any[];
}

(async () => {
  const files = (await fs.readdir(FLAGS_DIR)).filter((f) => f.endsWith('.json'));

  const keys: string[] = [];
  const flagConfigs: FlagConfig[] = [];

  for (const file of files) {
    const json: FlagConfig = JSON.parse(await fs.readFile(join(FLAGS_DIR, file), 'utf8'));
    keys.push(json.key);
    flagConfigs.push(json);
  }

  // emit const-object + literal-type + local config
  const body = `/**
* 🚨 AUTO-GENERATED — do not modify by hand
* Run \`npm run generate:flags\` to refresh.
*/

export const FeatureFlags = {
${keys.map((k) => `  ${k.replace(/[-\s]/g, '_')}: '${k}',`).join('\n')}
} as const;

export type FeatureFlag = typeof FeatureFlags[keyof typeof FeatureFlags];

export const LocalFeatureFlags = {
${flagConfigs
  .map(
    (flag) => `  ${flag.key.replace(/[-\s]/g, '_')}: {
    key: '${flag.key}',
    name: '${flag.name}',
    enabled: ${flag.active},
  },`
  )
  .join('\n')}
} as const;

export type LocalFeatureFlagConfig = {
  key: string;
  name: string;
  enabled: boolean;
};
`;

  await fs.mkdir('src/generated', { recursive: true });
  await fs.writeFile(OUT_FILE, body);
  console.log(`✓ wrote ${OUT_FILE} (${keys.length} flags)`);
})();
