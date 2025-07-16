Object.defineProperty(exports, '__esModule', { value: true });
// scripts/generate-feature-flags.ts
const node_fs_1 = require('node:fs');
const node_path_1 = require('node:path');
const FLAGS_DIR = 'posthog/feature_flags';
const OUT_FILE = 'src/generated/feature-flags.ts';
(async () => {
  const files = (await node_fs_1.promises.readdir(FLAGS_DIR)).filter((f) => f.endsWith('.json'));
  const keys = [];
  for (const file of files) {
    const json = JSON.parse(
      await node_fs_1.promises.readFile(node_path_1.join(FLAGS_DIR, file), 'utf8')
    );
    keys.push(json.key); // assumes every flag has a `key`
  }
  // emit const-object + literal-type
  const body = `/**
* 🚨 AUTO-GENERATED — do not modify by hand
* Run \`npm run generate:flags\` to refresh.
*/

export const FeatureFlags = {
${keys.map((k) => `  ${k.replace(/[-\s]/g, '_')}: '${k}',`).join('\n')}
} as const;

export type FeatureFlag = typeof FeatureFlags[keyof typeof FeatureFlags];
`;
  await node_fs_1.promises.mkdir('src/generated', { recursive: true });
  await node_fs_1.promises.writeFile(OUT_FILE, body);
  console.log(`✓ wrote ${OUT_FILE} (${keys.length} flags)`);
})();
//# sourceMappingURL=generate-feature-flags.js.map
