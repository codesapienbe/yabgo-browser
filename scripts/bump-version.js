#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function die(msg) {
  console.error(msg);
  process.exit(1);
}

const input = process.argv[2];
if (!input) {
  die('Usage: bump-version.js <version>  (example: 1.2.3 or v1.2.3)');
}

const version = input.replace(/^v/, '');
const root = path.resolve(__dirname, '..');
const pkgPath = path.join(root, 'package.json');
const versionFilePath = path.join(root, 'VERSION');

if (!fs.existsSync(pkgPath)) die('package.json not found');

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
if (pkg.version === version) {
  console.log(`package.json already at version ${version}`);
  process.exit(0);
}

pkg.version = version;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
console.log(`Updated package.json to version ${version}`);

// If a VERSION file exists, ensure it matches
try {
  const hasVersionFile = fs.existsSync(versionFilePath);
  if (hasVersionFile) {
    const current = fs.readFileSync(versionFilePath, 'utf8').trim();
    if (current !== version) {
      fs.writeFileSync(versionFilePath, version + '\n', 'utf8');
      console.log(`Updated VERSION file to ${version}`);
      execSync('git add VERSION', { stdio: 'inherit' });
    }
  }
} catch (e) {
  console.warn('Warning: failed to update VERSION file:', e.message || e);
}

// Commit package.json (and VERSION if updated)
try {
  execSync('git add package.json', { stdio: 'inherit' });
  execSync(`git commit -m "chore(release): bump package.json version to ${version}"`, { stdio: 'inherit' });
  console.log('Committed package.json');
} catch (e) {
  // If commit fails because there's nothing to commit, it's ok
  console.warn('Warning: git commit failed (there may be nothing to commit):', e.message || e);
}

console.log('bump-version completed successfully.');

