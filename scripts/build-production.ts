/**
 * Production build script for ResultBoard.
 *
 * Runs typecheck, lint, tests, WXT build, and validates the output.
 * Exits with non-zero code on any failure for CI integration.
 *
 * Usage: npx tsx scripts/build-production.ts
 */

import { execSync } from 'node:child_process';
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const OUTPUT_DIR = join(ROOT, '.output', 'chrome-mv3');
const MAX_BUNDLE_SIZE_MB = 10;
const MAX_SINGLE_FILE_SIZE_MB = 4;

interface BuildStep {
  name: string;
  command: string;
  optional?: boolean;
}

const steps: BuildStep[] = [
  { name: 'Generate WXT Types', command: 'npx wxt prepare' },
  { name: 'Type Check', command: 'npx tsc --noEmit -p tsconfig.build.json' },
  { name: 'Lint', command: 'npx eslint . --max-warnings 0' },
  { name: 'Unit Tests', command: 'npx vitest run' },
  { name: 'Build Extension', command: 'npx wxt build' },
];

function log(message: string): void {
  console.log(`\n[build-production] ${message}`);
}

function logError(message: string): void {
  console.error(`\n[build-production] ERROR: ${message}`);
}

function runStep(step: BuildStep): boolean {
  log(`Running: ${step.name}...`);
  try {
    execSync(step.command, {
      cwd: ROOT,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: step.name === 'Unit Tests' ? 'test' : 'production' },
    });
    log(`${step.name} - PASSED`);
    return true;
  } catch {
    if (step.optional) {
      log(`${step.name} - SKIPPED (optional)`);
      return true;
    }
    logError(`${step.name} - FAILED`);
    return false;
  }
}

function getDirectorySize(dirPath: string): number {
  let totalSize = 0;

  function walkDir(currentPath: string): void {
    const entries = readdirSync(currentPath);
    for (const entry of entries) {
      const entryPath = join(currentPath, entry);
      const stat = statSync(entryPath);
      if (stat.isDirectory()) {
        walkDir(entryPath);
      } else {
        totalSize += stat.size;
      }
    }
  }

  walkDir(dirPath);
  return totalSize;
}

function checkFileSize(filePath: string, fileName: string): boolean {
  const stat = statSync(filePath);
  const sizeMB = stat.size / (1024 * 1024);
  if (sizeMB > MAX_SINGLE_FILE_SIZE_MB) {
    logError(`File "${fileName}" is ${sizeMB.toFixed(2)}MB (max ${MAX_SINGLE_FILE_SIZE_MB}MB)`);
    return false;
  }
  return true;
}

function validateOutput(): boolean {
  log('Validating build output...');

  // Check output directory exists
  try {
    statSync(OUTPUT_DIR);
  } catch {
    logError(`Output directory not found: ${OUTPUT_DIR}`);
    return false;
  }

  // Check total bundle size
  const totalSize = getDirectorySize(OUTPUT_DIR);
  const totalSizeMB = totalSize / (1024 * 1024);
  log(`Total bundle size: ${totalSizeMB.toFixed(2)}MB`);

  if (totalSizeMB > MAX_BUNDLE_SIZE_MB) {
    logError(`Bundle size ${totalSizeMB.toFixed(2)}MB exceeds limit of ${MAX_BUNDLE_SIZE_MB}MB`);
    return false;
  }

  // Check manifest.json exists
  const manifestPath = join(OUTPUT_DIR, 'manifest.json');
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    if (!manifest.version) {
      logError('manifest.json missing version field');
      return false;
    }
    if (!manifest.name) {
      logError('manifest.json missing name field');
      return false;
    }
    log(`Manifest version: ${manifest.version}`);
    log(`Manifest name: ${manifest.name}`);
  } catch {
    logError('manifest.json not found or invalid');
    return false;
  }

  // Check individual file sizes
  let allFilesOk = true;
  function checkDir(dirPath: string): void {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const stat = statSync(entryPath);
      if (stat.isDirectory()) {
        checkDir(entryPath);
      } else {
        if (!checkFileSize(entryPath, entryPath.replace(OUTPUT_DIR, ''))) {
          allFilesOk = false;
        }
      }
    }
  }
  checkDir(OUTPUT_DIR);

  if (!allFilesOk) {
    return false;
  }

  // Check for console.log statements in JS output files
  log('Checking for console.log statements...');
  let hasConsoleLogs = false;
  function checkConsoleLog(dirPath: string): void {
    const entries = readdirSync(dirPath);
    for (const entry of entries) {
      const entryPath = join(dirPath, entry);
      const stat = statSync(entryPath);
      if (stat.isDirectory()) {
        checkConsoleLog(entryPath);
      } else if (entry.endsWith('.js')) {
        const content = readFileSync(entryPath, 'utf-8');
        // Look for console.log but not console.error or console.warn (those are intentional)
        const matches = content.match(/console\.log\(/g);
        if (matches && matches.length > 0) {
          logError(`Found ${matches.length} console.log() in ${entryPath.replace(OUTPUT_DIR, '')}`);
          hasConsoleLogs = true;
        }
      }
    }
  }
  checkConsoleLog(OUTPUT_DIR);

  if (hasConsoleLogs) {
    logError('Production build contains console.log statements. Remove them or use console.warn/error.');
    return false;
  }

  log('Output validation - PASSED');
  return true;
}

function generateZip(): boolean {
  log('Generating distributable zip...');
  try {
    execSync('npx wxt zip', {
      cwd: ROOT,
      stdio: 'inherit',
    });
    log('Zip generation - PASSED');
    return true;
  } catch {
    logError('Zip generation - FAILED');
    return false;
  }
}

async function main(): Promise<void> {
  log('Starting production build pipeline...');
  log(`Root: ${ROOT}`);
  log(`Output: ${OUTPUT_DIR}`);
  log('');

  // Run build steps
  for (const step of steps) {
    if (!runStep(step)) {
      logError(`Build failed at step: ${step.name}`);
      process.exit(1);
    }
  }

  // Validate output
  if (!validateOutput()) {
    logError('Output validation failed');
    process.exit(1);
  }

  // Generate zip
  if (!generateZip()) {
    logError('Zip generation failed');
    process.exit(1);
  }

  log('');
  log('=== Production build completed successfully ===');
  log('');
  log('Output directory: .output/chrome-mv3/');
  log('Distributable zip: .output/resultboard-*.zip');
  process.exit(0);
}

void main();
