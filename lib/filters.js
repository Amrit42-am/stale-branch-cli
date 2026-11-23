export const PROTECTED_BRANCHES = new Set(['main', 'master', 'develop', 'production', 'release']);

function wildcardToRegExp(pattern) {
  return new RegExp(`^${String(pattern).replace(/[\\^$+.()|{}[\]]/g, '\\$&').replace(/\*/g, '.*')}$`);
}

export function matchesPattern(name, pattern) {
  return wildcardToRegExp(pattern).test(name);
}

export function isProtected(branch) {
  return PROTECTED_BRANCHES.has(branch.isRemote ? branch.remoteBranch : branch.name);
}

export function isIgnored(branch, patterns = []) { return patterns.some((pattern) => matchesPattern(branch.name, pattern) || (!branch.isRemote && matchesPattern(branch.name, pattern))); }

export function filterBranches(branches, { currentBranch = null, ignore = [] } = {}) {
  return branches.filter((branch) => !isProtected(branch) && !(currentBranch && !branch.isRemote && branch.name === currentBranch) && !isIgnored(branch, ignore));
}
