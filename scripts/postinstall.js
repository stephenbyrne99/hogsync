#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function getPlatformBinary() {
  const platform = os.platform();
  const arch = os.arch();

  let binaryName;

  if (platform === 'darwin') {
    if (arch === 'arm64') {
      binaryName = 'hogsync-darwin-arm64';
    } else {
      binaryName = 'hogsync-darwin-x64';
    }
  } else if (platform === 'linux') {
    binaryName = 'hogsync-linux-x64';
  } else if (platform === 'win32') {
    binaryName = 'hogsync-win32-x64.exe';
  } else {
    throw new Error(`Unsupported platform: ${platform}-${arch}`);
  }

  return binaryName;
}

function main() {
  try {
    // Skip postinstall in CI/development environments
    if (process.env.CI || process.env.NODE_ENV === 'development') {
      console.log('Skipping binary installation in CI/development environment');
      return;
    }

    const binaryName = getPlatformBinary();
    const binDir = path.join(__dirname, '..', 'bin');
    const sourcePath = path.join(binDir, binaryName);
    const targetPath = path.join(binDir, 'hogsync');

    // Skip postinstall if bin directory doesn't exist (development/CI scenario)
    if (!fs.existsSync(binDir)) {
      console.log('Skipping binary installation - bin directory not found (development mode)');
      return;
    }

    // Check if the platform-specific binary exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`Binary not found for your platform: ${binaryName}`);
      try {
        console.error('Available binaries:', fs.readdirSync(binDir));
      } catch (_e) {
        console.error('Could not list available binaries');
      }
      process.exit(1);
    }
    // Remove existing hogsync binary if it exists
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
    }

    // Copy the platform-specific binary to the generic name
    fs.copyFileSync(sourcePath, targetPath);

    // Make it executable on Unix-like systems
    if (process.platform !== 'win32') {
      fs.chmodSync(targetPath, '755');
    }

    console.log(`Installed hogsync binary for ${process.platform}-${process.arch}`);
  } catch (error) {
    console.error('Failed to install hogsync binary:', error.message);
    process.exit(1);
  }
}

main();
