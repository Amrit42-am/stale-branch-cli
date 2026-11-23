import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { findStaleBranches, deleteBranches } from '../lib/index.js';

const exec = promisify(execFile);
async function git(cwd, ...args) { await exec('git', args, { cwd }); }
async function repo() { const cwd = await mkdtemp(join(tmpdir(), 'stale-api-')); await git(cwd, 'init', '-q'); await git(cwd, 'config', 'user.email', 'test@example.com'); await git(cwd, 'config', 'user.name', 'Test'); await writeFile(join(cwd, 'file'), 'x'); await git(cwd, 'add', '.'); await git(cwd, 'commit', '-qm', 'initial'); return cwd; }

test('finds stale branches and cannot delete protected/current branches', async () => {
  const cwd = await repo();
  await git(cwd, 'branch', 'old-work');
  const stale = await findStaleBranches({ cwd, days: 0, now: Date.now() + 2 * 86400000 });
  assert.equal(stale.some((b) => b.name === 'old-work'), true);
  const result = await deleteBranches([...stale, { name: 'main', ref: 'refs/heads/main', isRemote: false }], { cwd });
  assert.ok(result.deleted.includes('old-work'));
  assert.ok(result.skipped.some((b) => b.name === 'main'));
});
