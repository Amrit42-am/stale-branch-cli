import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { getBranches } from '../lib/git.js';

const exec = promisify(execFile);
async function git(cwd, ...args) { await exec('git', args, { cwd }); }
async function repo() { const cwd = await mkdtemp(join(tmpdir(), 'stale-git-')); await git(cwd, 'init', '-q'); await git(cwd, 'config', 'user.email', 'test@example.com'); await git(cwd, 'config', 'user.name', 'Test'); await writeFile(join(cwd, 'file'), 'x'); await git(cwd, 'add', '.'); await git(cwd, 'commit', '-qm', 'initial'); return cwd; }

test('discovers local nested branches and excludes remote HEAD', async () => {
  const cwd = await repo();
  await git(cwd, 'branch', 'feature/nested');
  const branches = await getBranches({ cwd, includeRemote: true });
  assert.ok(branches.some((b) => b.name === 'feature/nested' && !b.isRemote));
  assert.equal(branches.some((b) => b.name.endsWith('/HEAD')), false);
});

test('discovers remote-tracking branches without confusing them with local branches', async () => {
  const cwd = await repo();
  const bare = await mkdtemp(join(tmpdir(), 'stale-remote-'));
  await git(bare, 'init', '--bare', '-q');
  await git(cwd, 'branch', 'feature/remote-nested');
  await git(cwd, 'remote', 'add', 'origin', bare);
  await git(cwd, 'push', '-q', 'origin', 'feature/remote-nested');
  await git(cwd, 'fetch', '-q', 'origin');
  const branches = await getBranches({ cwd, includeRemote: true });
  assert.ok(branches.some((b) => b.name === 'origin/feature/remote-nested' && b.isRemote && b.remote === 'origin' && b.remoteBranch === 'feature/remote-nested'));
});
