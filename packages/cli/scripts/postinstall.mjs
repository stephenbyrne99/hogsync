#!/usr/bin/env node

import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const require = createRequire(import.meta.url);

function detectPlatformAndArch() {
  // Map platform names
  let platform;
  switch (os.platform()) {
    case 'darwin':
      platform = 'darwin';
      break;
    case 'linux':
      platform = 'linux';
      break;
    case 'win32':
      platform = 'windows';
      break;
    default:
      platform = os.platform();
      break;
  }

  // Map architecture names
  let arch;
  switch (os.arch()) {
    case 'x64':
      arch = 'x64';
      break;
    case 'arm64':
      arch = 'arm64';
      break;
    case 'arm':
      arch = 'arm';
      break;
    default:
      arch = os.arch();
      break;
  }

  return { platform, arch };
}

function findBinary() {
  const { platform, arch } = detectPlatformAndArch();
  const packageName = `hogsync-${platform}-${arch}`;
  const binary = platform === 'windows' ? 'hogsync.exe' : 'hogsync';

  try {
    // Use require.resolve to find the package
    const packageJsonPath = require.resolve(`${packageName}/package.json`);
    const packageDir = path.dirname(packageJsonPath);
    const binaryPath = path.join(packageDir, 'bin', binary);

    if (!fs.existsSync(binaryPath)) {
      throw new Error(`Binary not found at ${binaryPath}`);
    }

    return binaryPath;
  } catch (error) {
    throw new Error(`Could not find package ${packageName}: ${error.message}`);
  }
}

function main() {
  // Note: We run postinstall in all environments to ensure proper binary resolution
  // However, we don't fail if platform packages are missing since the shell script
  // will handle runtime resolution

  try {
    const binaryPath = findBinary();
    console.log(`hogsync platform binary found: ${binaryPath}`);
  } catch (_error) {
    // Don't fail - the shell script wrapper will handle runtime resolution
    console.log('Platform-specific binary not found during postinstall, will resolve at runtime');
    console.log(
      `Looked for: hogsync-${detectPlatformAndArch().platform}-${detectPlatformAndArch().arch}`
    );
  }
}

main();
