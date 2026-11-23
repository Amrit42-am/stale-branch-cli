import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join } from 'node:path';

const exec = promisify(execFile);
const cli = join(process.cwd(), 'bin', 'cli.js');
test('help and version work', async () => {
  const help = await exec(process.execPath, [cli, '--help']);
  assert.match(help.stdout, /Usage: stale-branch/);
  const version = await exec(process.execPath, [cli, '--version']);
  assert.match(version.stdout.trim(), /^1\.0\.0$/);
});
