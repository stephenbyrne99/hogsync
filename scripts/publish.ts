#!/usr/bin/env bun

import { $ } from 'bun';

import pkg from '../package.json';

const dry = process.argv.includes('--dry');
const snapshot = process.argv.includes('--snapshot');

const version = snapshot
  ? `0.0.0-${new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '')}`
  : await $`git describe --tags --abbrev=0`
      .text()
      .then((x) => x.substring(1).trim())
      .catch(() => {
        console.error('tag not found');
        process.exit(1);
      });

console.log(`publishing ${version}`);

const targets = [
  ['linux', 'arm64'],
  ['linux', 'x64'],
  ['darwin', 'x64'],
  ['darwin', 'arm64'],
  ['windows', 'x64'],
];

await $`rm -rf dist`;

const optionalDependencies: Record<string, string> = {};
const npmTag = snapshot ? 'snapshot' : 'latest';

for (const [os, arch] of targets) {
  console.log(`building ${os}-${arch}`);
  const name = `${pkg.name}-${os}-${arch}`;
  await $`mkdir -p dist/${name}/bin`;

  // Build the binary for the specific target
  const binaryName = os === 'windows' ? 'hogsync.exe' : 'hogsync';
  await $`bun build --define HOGSYNC_VERSION="'${version}'" --compile --minify --target=bun-${os}-${arch} --outfile=dist/${name}/bin/${binaryName} ./src/cli.ts`;

  // Create package.json for the platform-specific package
  await Bun.file(`dist/${name}/package.json`).write(
    JSON.stringify(
      {
        name,
        version,
        os: [os === 'windows' ? 'win32' : os],
        cpu: [arch],
      },
      null,
      2
    )
  );

  // Publish the platform-specific package
  if (!dry) await $`cd dist/${name} && bun publish --access public --tag ${npmTag}`;
  optionalDependencies[name] = version;
}

// Create the main package that will install the correct binary
await $`mkdir -p ./dist/${pkg.name}`;
await $`cp -r ./bin ./dist/${pkg.name}/bin`;
await $`cp ./scripts/postinstall.mjs ./dist/${pkg.name}/postinstall.mjs`;

await Bun.file(`./dist/${pkg.name}/package.json`).write(
  JSON.stringify(
    {
      name: pkg.name,
      bin: {
        [pkg.name]: `./bin/${pkg.name}`,
      },
      scripts: {
        postinstall: 'node ./postinstall.mjs',
      },
      version,
      optionalDependencies,
      // Include other important fields from original package.json
      description: pkg.description,
      keywords: pkg.keywords,
      author: pkg.author,
      license: pkg.license,
      repository: pkg.repository,
      exports: pkg.exports,
      peerDependencies: pkg.peerDependencies,
      peerDependenciesMeta: pkg.peerDependenciesMeta,
    },
    null,
    2
  )
);

if (!dry) await $`cd ./dist/${pkg.name} && bun publish --access public --tag ${npmTag}`;

if (!snapshot) {
  // Github Release
  for (const key of Object.keys(optionalDependencies)) {
    await $`cd dist/${key}/bin && zip -r ../../${key}.zip *`;
  }

  const previous = await fetch(
    `https://api.github.com/repos/${pkg.repository.url.split('/').slice(-2).join('/').replace('.git', '')}/releases/latest`
  )
    .then((res) => res.json())
    .then((data) => data.tag_name)
    .catch(() => 'v0.0.0'); // fallback if no previous release

  const commits = await fetch(
    `https://api.github.com/repos/${pkg.repository.url.split('/').slice(-2).join('/').replace('.git', '')}/compare/${previous}...HEAD`
  )
    .then((res) => res.json())
    .then((data) => data.commits || [])
    .catch(() => []);

  const notes = commits
    .map((commit: { commit: { message: string } }) => `- ${commit.commit.message.split('\n')[0]}`)
    .filter((x: string) => {
      const lower = x.toLowerCase();
      return (
        !lower.includes('ignore:') &&
        !lower.includes('chore:') &&
        !lower.includes('ci:') &&
        !lower.includes('wip:') &&
        !lower.includes('docs:') &&
        !lower.includes('doc:')
      );
    })
    .join('\n');

  if (!dry)
    await $`gh release create v${version} --title "v${version}" --notes ${notes} ./dist/*.zip`;
}
