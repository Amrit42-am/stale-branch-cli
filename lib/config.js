import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ConfigError } from './errors.js';

export const DEFAULT_CONFIG = Object.freeze({ days: 90, includeRemote: false, ignore: [] });

function validDays(value) { return Number.isInteger(value) && value >= 0 && Number.isFinite(value); }

export function validateConfig(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConfigError('Configuration must be a JSON object.');
  const allowed = new Set(['days', 'includeRemote', 'ignore']);
  for (const key of Object.keys(value)) if (!allowed.has(key)) throw new ConfigError(`Unsupported configuration key: ${key}`);
  if (value.days !== undefined && !validDays(value.days)) throw new ConfigError('Configuration "days" must be a non-negative integer.');
  if (value.includeRemote !== undefined && typeof value.includeRemote !== 'boolean') throw new ConfigError('Configuration "includeRemote" must be boolean.');
  if (value.ignore !== undefined && (!Array.isArray(value.ignore) || value.ignore.some((p) => typeof p !== 'string' || !p))) throw new ConfigError('Configuration "ignore" must be an array of non-empty strings.');
  return value;
}

export async function loadConfig({ cwd = process.cwd() } = {}) {
  const path = join(cwd, '.stale-branchrc');
  try {
    const text = await readFile(path, 'utf8');
    let parsed;
    try { parsed = JSON.parse(text); } catch (error) { throw new ConfigError(`Invalid JSON in ${path}.`, error); }
    return { path, config: validateConfig(parsed) };
  } catch (error) {
    if (error?.code === 'ENOENT') return { path, config: {} };
    if (error instanceof ConfigError) throw error;
    throw new ConfigError(`Unable to read ${path}: ${error.message}`, error);
  }
}

export function resolveConfig(fileConfig = {}, cliOptions = {}) {
  const file = { ...DEFAULT_CONFIG, ...fileConfig };
  const cliIgnore = cliOptions.ignore ?? [];
  return { days: cliOptions.days ?? file.days, includeRemote: cliOptions.includeRemote ?? file.includeRemote, ignore: [...new Set([...(file.ignore ?? []), ...cliIgnore])] };
}
