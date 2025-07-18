#!/usr/bin/env node

import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
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

function isCI() {
  return !!(
    process.env.CI ||
    process.env.CONTINUOUS_INTEGRATION ||
    process.env.BUILD_NUMBER ||
    process.env.GITHUB_ACTIONS ||
    process.env.GITLAB_CI ||
    process.env.CIRCLECI ||
    process.env.TRAVIS ||
    process.env.JENKINS_URL ||
    process.env.BUILDKITE ||
    process.env.DRONE
  );
}

function main() {
  // Skip postinstall in CI environments
  if (isCI()) {
    console.log('Skipping hogsync binary symlink creation in CI environment');
    return;
  }

  try {
    const binaryPath = findBinary();
    const binScript = path.join(__dirname, 'bin', 'hogsync');

    // Ensure bin directory exists
    const binDir = path.dirname(binScript);
    if (!fs.existsSync(binDir)) {
      fs.mkdirSync(binDir, { recursive: true });
    }

    // Remove existing bin script if it exists
    if (fs.existsSync(binScript)) {
      fs.unlinkSync(binScript);
    }

    // Create symlink to the actual binary
    fs.symlinkSync(binaryPath, binScript);
    console.log(`hogsync binary symlinked: ${binScript} -> ${binaryPath}`);
  } catch (error) {
    console.error('Failed to create hogsync binary symlink:', error.message);
    process.exit(1);
  }
}

main();
