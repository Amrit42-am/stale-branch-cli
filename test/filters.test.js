import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesPattern, isProtected, filterBranches } from '../lib/filters.js';

test('wildcard matching escapes regex characters', () => {
  assert.equal(matchesPattern('feature/a.b', 'feature/*'), true);
  assert.equal(matchesPattern('feature/aXb', 'feature/a.b'), false);
});

test('protects local and remote critical branches and filters current branch', () => {
  assert.equal(isProtected({ name: 'main', isRemote: false }), true);
  assert.equal(isProtected({ name: 'origin/main', remoteBranch: 'main', isRemote: true }), true);
  const branches = [{ name: 'main', isRemote: false }, { name: 'work', isRemote: false }, { name: 'origin/work', remoteBranch: 'work', isRemote: true }];
  assert.deepEqual(filterBranches(branches, { currentBranch: 'work' }).map((b) => b.name), ['origin/work']);
});
