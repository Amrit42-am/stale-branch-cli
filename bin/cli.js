#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { findStaleBranches, deleteBranches } from '../lib/index.js';
import { loadConfig, resolveConfig } from '../lib/config.js';
import { confirm } from '../lib/prompt.js';
import { formatBranches, formatDeletion, formatJson } from '../lib/formatter.js';
import { InvalidArgumentError } from '../lib/errors.js';

const cwd = process.cwd();
const usage = `Usage: stale-branch [list|delete|config] [options]

Options:
  --days <n>          Stale threshold in days (default: 90)
  --remote            Include remote-tracking branches
  --json              Output JSON
  --ignore <patterns> Comma-separated branch names or * patterns
  --dry-run           Preview deletion without modifying Git
  --yes, -y           Skip confirmation
  --delete-remote     Permit deletion of actual remote branches
  --force              Force-delete unmerged local branches
  --help, -h          Show help
  --version, -v       Show version`;

function parseArgs(argv) {
  const args = [...argv];
  let command = 'list';
  const commandIndex = args.findIndex((arg) => ['list', 'delete', 'config'].includes(arg));
  if (commandIndex >= 0) command = args.splice(commandIndex, 1)[0];
  const options = { ignore: [] };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg === '--version' || arg === '-v') options.version = true;
    else if (arg === '--remote') options.includeRemote = true;
    else if (arg === '--json') options.json = true;
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--yes' || arg === '-y') options.yes = true;
    else if (arg === '--delete-remote') options.deleteRemote = true;
    else if (arg === '--force') options.force = true;
    else if (arg === '--days' || arg === '--ignore') {
      if (i + 1 >= args.length || args[i + 1].startsWith('-')) throw new InvalidArgumentError(`${arg} requires a value.`);
      const value = args[++i];
      if (arg === '--days') { if (!/^\d+$/.test(value)) throw new InvalidArgumentError('--days must be a non-negative integer.'); options.days = Number(value); }
      else options.ignore.push(...value.split(',').filter(Boolean));
    } else throw new InvalidArgumentError(`Unknown flag: ${arg}`);
  }
  if (options.deleteRemote) options.includeRemote = true;
  return { command, options };
}

async function version() { const pkg = JSON.parse(await readFile(join(dirname(fileURLToPath(import.meta.url)), '..', 'package.json'), 'utf8')); return pkg.version; }

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  if (options.help) { console.log(usage); return; }
  if (options.version) { console.log(await version()); return; }
  const loaded = await loadConfig({ cwd });
  const resolved = resolveConfig(loaded.config, options);
  if (command === 'config') { console.log(formatJson({ config: loaded.config, resolved })); return; }
  const stale = await findStaleBranches({ ...resolved, cwd });
  if (command === 'list') { process.stdout.write(options.json ? formatJson(stale) : formatBranches(stale, resolved.days)); return; }
  if (!stale.length) { process.stdout.write(options.json ? formatJson({ deleted: [], failed: [], skipped: [] }) : 'No stale branches found.\n'); return; }
  if (!options.deleteRemote) {
    const remoteCount = stale.filter((branch) => branch.isRemote).length;
    if (remoteCount) process.stderr.write(`Remote-tracking candidates are preview-only; use --delete-remote to delete actual remote branches.\n`);
  }
  if (!options.yes && !options.dryRun && !(await confirm(`Delete ${stale.length} stale branch(es)?`, {}))) { process.stdout.write('Deletion cancelled.\n'); return; }
  const result = options.dryRun ? { deleted: [], failed: [], skipped: stale.map((branch) => ({ name: branch.name, reason: 'dry run' })) } : await deleteBranches(stale, { force: options.force, deleteRemote: options.deleteRemote, cwd });
  process.stdout.write(options.json ? formatJson(result) : formatDeletion(result));
  if (result.failed.length) process.exitCode = 1;
}

main().catch((error) => { process.stderr.write(`Error: ${error.message}\n`); process.stderr.write(`${usage}\n`); process.exitCode = 1; });
