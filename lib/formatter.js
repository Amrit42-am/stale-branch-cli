export function formatJson(value) { return `${JSON.stringify(value, (key, value) => key === 'lastCommit' && value instanceof Date ? value.toISOString() : value, 2)}\n`; }

export function formatBranches(branches, days) {
  if (!branches.length) return 'No stale branches found.\n';
  const lines = [`Stale branches (older than ${days} days)`, ''];
  for (const kind of [false, true]) {
    const group = branches.filter((b) => b.isRemote === kind);
    if (!group.length) continue;
    lines.push(kind ? 'REMOTE-TRACKING BRANCHES' : 'LOCAL BRANCHES', '');
    for (const branch of group) lines.push(`  ${branch.name.padEnd(Math.max(2, ...group.map((b) => b.name.length)))}  ${branch.ageDays} days ago  (${branch.lastCommit.toISOString().slice(0, 10)})`);
    lines.push('');
  }
  lines.push(`Total: ${branches.length} stale branch${branches.length === 1 ? '' : 'es'}`);
  return `${lines.join('\n')}\n`;
}

export function formatDeletion(result) {
  const lines = [];
  if (result.deleted.length) lines.push('Deleted:', ...result.deleted.map((name) => `  ${name}`));
  if (result.failed.length) lines.push('Failed:', ...result.failed.map(({ name, error }) => `  ${name}: ${error}`));
  if (!lines.length) lines.push('No branches were deleted.');
  return `${lines.join('\n')}\n`;
}
