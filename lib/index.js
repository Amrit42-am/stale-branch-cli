import { getBranches, getCurrentBranch, refExists, deleteLocalBranch, deleteRemoteBranch, ensureRepository, validateBranchName } from './git.js';
import { filterBranches, isProtected } from './filters.js';
import { InvalidArgumentError } from './errors.js';

const DAY_MS = 24 * 60 * 60 * 1000;

function validateDays(days) { if (!Number.isInteger(days) || days < 0 || !Number.isFinite(days)) throw new InvalidArgumentError('days must be a non-negative integer.'); }

export async function findStaleBranches({ days = 90, includeRemote = false, ignore = [], cwd = process.cwd(), now = Date.now() } = {}) {
  validateDays(days);
  if (!Array.isArray(ignore) || ignore.some((p) => typeof p !== 'string')) throw new InvalidArgumentError('ignore must be an array of strings.');
  await ensureRepository({ cwd });
  const [branches, currentBranch] = await Promise.all([getBranches({ cwd, includeRemote }), getCurrentBranch({ cwd })]);
  return filterBranches(branches.map((branch) => {
    const ageMs = now - branch.lastCommit.getTime();
    return { ...branch, ageDays: Math.floor(ageMs / DAY_MS), _ageMs: ageMs };
  }).filter((branch) => branch._ageMs > days * DAY_MS), { currentBranch, ignore })
    .map(({ _ageMs, ...branch }) => branch)
    .sort((a, b) => a.lastCommit - b.lastCommit || a.name.localeCompare(b.name));
}

export async function deleteBranches(branches, { force = false, deleteRemote = false, cwd = process.cwd() } = {}) {
  if (!Array.isArray(branches)) throw new InvalidArgumentError('branches must be an array.');
  await ensureRepository({ cwd });
  const deleted = [], failed = [], skipped = [];
  const currentBranch = await getCurrentBranch({ cwd });
  for (const branch of branches) {
    const name = branch?.name;
    const isRemote = branch?.isRemote === true;
    const remoteSlash = isRemote ? name?.indexOf('/') : -1;
    const derivedRemote = isRemote && remoteSlash > 0 ? name.slice(0, remoteSlash) : null;
    const derivedRemoteBranch = isRemote && remoteSlash > 0 ? name.slice(remoteSlash + 1) : null;
    const valid = validateBranchName(name) && typeof branch?.ref === 'string' && (isRemote
      ? branch.ref === `refs/remotes/${name}` && branch.remote === derivedRemote && branch.remoteBranch === derivedRemoteBranch
      : branch.ref === `refs/heads/${name}`);
    if (!valid || isProtected({ name, isRemote, remoteBranch: branch?.remoteBranch })) { skipped.push({ name: name ?? null, reason: 'protected or invalid branch reference' }); continue; }
    if (!isRemote && (await getCurrentBranch({ cwd })) === name) { skipped.push({ name, reason: 'current branch' }); continue; }
    if (isRemote && !deleteRemote) { skipped.push({ name, reason: 'remote deletion not enabled' }); continue; }
    if (!(await refExists(branch.ref, { cwd }))) { skipped.push({ name, reason: 'branch no longer exists' }); continue; }
    try {
      if (isRemote) await deleteRemoteBranch(derivedRemote, derivedRemoteBranch, { cwd });
      else await deleteLocalBranch(name, { force, cwd });
      deleted.push(name);
    } catch (error) { failed.push({ name, error: error.message }); }
  }
  return { deleted, failed, skipped };
}

export { PROTECTED_BRANCHES } from './filters.js';
export { loadConfig, resolveConfig, DEFAULT_CONFIG } from './config.js';
