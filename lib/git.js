import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { GitCommandError, RepositoryError } from './errors.js';

const execFileAsync = promisify(execFile);
const MAX_BUFFER = 4 * 1024 * 1024;

export async function runGit(args, { cwd = process.cwd(), allowFailure = false } = {}) {
  try {
    const result = await execFileAsync('git', args, { cwd, maxBuffer: MAX_BUFFER, encoding: 'utf8' });
    return { stdout: result.stdout, stderr: result.stderr };
  } catch (error) {
    if (allowFailure) return { stdout: error.stdout ?? '', stderr: error.stderr ?? '', error };
    const detail = (error.stderr || error.message || '').trim();
    const message = detail.includes('not a git repository')
      ? `Not inside a Git repository (${cwd})`
      : detail.includes('ENOENT') || error.code === 'ENOENT'
        ? 'Git executable was not found. Install Git and try again.'
        : `Git command failed: git ${args.join(' ')}${detail ? `: ${detail}` : ''}`;
    throw new GitCommandError(message, { command: 'git', args, stderr: detail, exitCode: error.status, cause: error });
  }
}

function parseRefs(stdout, kind) {
  const records = stdout ? stdout.split('\n').filter(Boolean) : [];
  return records.map((record) => {
    const separator = record.indexOf('\0');
    if (separator < 1) throw new GitCommandError(`Malformed Git branch record: ${JSON.stringify(record)}`);
    const ref = record.slice(0, separator);
    const timestamp = Number(record.slice(separator + 1));
    if (!/^refs\/(heads|remotes)\/.+/.test(ref) || !Number.isFinite(timestamp)) {
      throw new GitCommandError(`Invalid Git branch metadata: ${JSON.stringify(record)}`);
    }
    if (kind === 'remote' && !ref.startsWith('refs/remotes/')) throw new GitCommandError(`Unexpected remote ref: ${ref}`);
    if (kind === 'local' && !ref.startsWith('refs/heads/')) throw new GitCommandError(`Unexpected local ref: ${ref}`);
    if (ref.includes('..') || ref.endsWith('/') || ref.includes('@{')) throw new GitCommandError(`Invalid Git reference: ${ref}`);
    const path = ref.replace(/^refs\/(heads|remotes)\//, '');
    if (kind === 'remote') {
      const slash = path.indexOf('/');
      if (slash < 1 || path.slice(slash + 1) === 'HEAD') return null;
      return { name: path, ref, isRemote: true, remote: path.slice(0, slash), remoteBranch: path.slice(slash + 1), lastCommit: new Date(timestamp * 1000) };
    }
    return { name: path, ref, isRemote: false, remote: null, remoteBranch: null, lastCommit: new Date(timestamp * 1000) };
  }).filter(Boolean);
}

export async function getBranches({ cwd = process.cwd(), includeRemote = false } = {}) {
  const format = '%(refname)%00%(committerdate:unix)';
  const local = await runGit(['for-each-ref', '--sort=-committerdate', `--format=${format}`, 'refs/heads/'], { cwd });
  const branches = parseRefs(local.stdout, 'local');
  if (includeRemote) {
    const remote = await runGit(['for-each-ref', '--sort=-committerdate', `--format=${format}`, 'refs/remotes/'], { cwd });
    branches.push(...parseRefs(remote.stdout, 'remote'));
  }
  return branches;
}

export async function getCurrentBranch({ cwd = process.cwd() } = {}) {
  const result = await runGit(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  const branch = result.stdout.trim();
  return branch && branch !== 'HEAD' ? branch : null;
}

export async function refExists(ref, { cwd = process.cwd() } = {}) {
  const result = await runGit(['show-ref', '--verify', '--quiet', ref], { cwd, allowFailure: true });
  return !result.error;
}

export function validateBranchName(name) {
  return typeof name === 'string' && name.length > 0 && !name.startsWith('-') && !name.includes('\0') && !name.includes('..') && !name.includes('@{') && !name.endsWith('/') && !name.startsWith('/') && !name.includes('\\');
}

export async function deleteLocalBranch(name, { force = false, cwd = process.cwd() } = {}) {
  if (!validateBranchName(name)) throw new GitCommandError(`Invalid local branch name: ${name}`);
  return runGit(['branch', force ? '-D' : '-d', '--', name], { cwd });
}

export async function deleteRemoteBranch(remote, branch, { cwd = process.cwd() } = {}) {
  if (!validateBranchName(remote) || !validateBranchName(branch)) throw new GitCommandError('Invalid remote branch reference');
  return runGit(['push', remote, '--delete', branch], { cwd });
}

export async function ensureRepository({ cwd = process.cwd() } = {}) {
  try { await runGit(['rev-parse', '--git-dir'], { cwd }); }
  catch (error) { if (error instanceof GitCommandError) throw new RepositoryError(error.message, error); throw error; }
}
