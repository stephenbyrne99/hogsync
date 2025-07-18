#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

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
    const binaryName = getPlatformBinary();
    const sourcePath = path.join(__dirname, '..', 'bin', binaryName);
    const targetPath = path.join(__dirname, '..', 'bin', 'hogsync');

    // Check if the platform-specific binary exists
    if (!fs.existsSync(sourcePath)) {
      console.error(`Binary not found for your platform: ${binaryName}`);
      console.error('Available binaries:', fs.readdirSync(path.join(__dirname, '..', 'bin')));
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
