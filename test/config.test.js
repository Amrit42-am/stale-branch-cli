import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, resolveConfig } from '../lib/config.js';
import { ConfigError } from '../lib/errors.js';

test('loads and resolves configuration with merged ignores', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'stale-config-'));
  await writeFile(join(cwd, '.stale-branchrc'), JSON.stringify({ days: 30, ignore: ['release/*'] }));
  const loaded = await loadConfig({ cwd });
  assert.deepEqual(resolveConfig(loaded.config, { days: 10, ignore: ['hotfix/*', 'release/*'] }), { days: 10, includeRemote: false, ignore: ['release/*', 'hotfix/*'] });
});

test('rejects invalid JSON', async () => {
  const cwd = await mkdtemp(join(tmpdir(), 'stale-config-'));
  await writeFile(join(cwd, '.stale-branchrc'), '{');
  await assert.rejects(loadConfig({ cwd }), ConfigError);
});
