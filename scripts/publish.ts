#!/usr/bin/env bun

import { $ } from 'bun';
import cliPkg from '../packages/cli/package.json';
import reactPkg from '../packages/react/package.json';

async function main() {
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
  ];

  await $`rm -rf dist packages/*/dist`;

  const optionalDependencies: Record<string, string> = {};
  const npmTag = snapshot ? 'snapshot' : 'latest';

  // Build and publish platform-specific CLI packages
  for (const [os, arch] of targets) {
    console.log(`building ${os}-${arch}`);
    const name = `${cliPkg.name}-${os}-${arch}`;
    await $`mkdir -p dist/${name}/bin`;

    // Build the binary for the specific target
    const binaryName = os === 'windows' ? 'hogsync.exe' : 'hogsync';
    await $`bun build --define HOGSYNC_VERSION="'${version}'" --compile --minify --target=bun-${os}-${arch} --outfile=dist/${name}/bin/${binaryName} ./packages/cli/src/cli.ts`;

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

  // Build and publish main CLI package
  console.log('building main CLI package');
  await $`cd packages/cli && bun run build`;
  await $`mkdir -p ./dist/${cliPkg.name}`;
  await $`mkdir -p ./dist/${cliPkg.name}/bin`;
  await $`mkdir -p ./dist/${cliPkg.name}/dist`;
  await $`mkdir -p ./dist/${cliPkg.name}/templates`;

  // Copy the bin directory with shell script
  await $`cp -r ./packages/cli/bin ./dist/${cliPkg.name}/bin`;

  await $`cp -r ./packages/cli/dist/* ./dist/${cliPkg.name}/dist/`;
  await $`cp -r ./packages/cli/templates/* ./dist/${cliPkg.name}/templates/`;
  await $`cp ./action.yml ./dist/${cliPkg.name}/action.yml`;
  await $`cp ./packages/cli/tsconfig.build.json ./dist/${cliPkg.name}/tsconfig.build.json`;
  await $`cp ./packages/cli/tsconfig.json ./dist/${cliPkg.name}/tsconfig.json`;

  const { scripts: _scripts, devDependencies: _devDependencies, ...publishPkg } = cliPkg;
  await Bun.file(`./dist/${cliPkg.name}/package.json`).write(
    JSON.stringify(
      {
        ...publishPkg,
        version,
        optionalDependencies,
        bin: {
          [cliPkg.name]: `./bin/${cliPkg.name}`,
        },
        scripts: {}, // Remove all scripts to prevent prepublishOnly from running
      },
      null,
      2
    )
  );

  if (!dry) await $`cd ./dist/${cliPkg.name} && bun publish --access public --tag ${npmTag}`;

  // Build and publish React package
  console.log('building React package');
  await $`cd packages/react && bun run build`;
  await $`mkdir -p ./dist/${reactPkg.name}`;
  await $`cp -r ./packages/react/dist ./dist/${reactPkg.name}/`;

  // Create React package.json for publishing
  const updatedReactPkg = {
    ...reactPkg,
    version,
  };

  await Bun.file(`./dist/${reactPkg.name}/package.json`).write(
    JSON.stringify(updatedReactPkg, null, 2)
  );

  if (!dry) {
    // Check if package exists first
    let packageExists = false;
    try {
      await $`bun pm view ${reactPkg.name} version`;
      packageExists = true;
    } catch {
      packageExists = false;
    }

    if (packageExists) {
      // Package exists, publish with tag
      await $`cd ./dist/${reactPkg.name} && bun publish --access public --tag ${npmTag}`;
    } else {
      // Package doesn't exist, publish initial version without tag
      console.log('Package does not exist, creating initial version...');
      await $`cd ./dist/${reactPkg.name} && bun publish --access public --no-tag`;

      // If we wanted a specific tag (not latest), add it after initial publish
      if (npmTag !== 'latest') {
        console.log(`Tagging initial version with ${npmTag}...`);
        await $`bun pm dist-tag add ${reactPkg.name}@${version} ${npmTag}`;
      }
    }
  }

  if (!snapshot) {
    // Github Release
    for (const key of Object.keys(optionalDependencies)) {
      await $`cd dist/${key}/bin && zip -r ../../${key}.zip *`;
    }

    const previous = await fetch(
      `https://api.github.com/repos/${cliPkg.repository.url.split('/').slice(-2).join('/').replace('.git', '')}/releases/latest`
    )
      .then((res) => res.json())
      .then((data) => data.tag_name)
      .catch(() => 'v0.0.0'); // fallback if no previous release

    const commits = await fetch(
      `https://api.github.com/repos/${cliPkg.repository.url.split('/').slice(-2).join('/').replace('.git', '')}/compare/${previous}...HEAD`
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
}

main().catch(console.error);
