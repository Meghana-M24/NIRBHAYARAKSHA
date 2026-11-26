import { readdirSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BACKEND_ROOT = path.resolve(
  fileURLToPath(new URL('..', import.meta.url))
);

const SKIP_DIRS = new Set([
  '.git',
  'node_modules',
  'coverage',
  'dist',
  'build',
]);

const files = [];

function walk(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        walk(fullPath);
      }
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.js')) {
      files.push(fullPath);
    }
  }
}

walk(BACKEND_ROOT);
files.sort();

let failures = 0;

for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], {
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    failures += 1;
    console.error(
      `Syntax check failed: ${path.relative(BACKEND_ROOT, file)}`
    );

    if (result.stderr) {
      console.error(result.stderr.trim());
    }
  }
}

if (failures > 0) {
  console.error(`${failures} file(s) failed the syntax check.`);
  process.exit(1);
}

console.log(`Syntax check passed for ${files.length} files.`);
