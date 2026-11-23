# stale-branch-cli

Find Git branches whose latest commit is older than a configurable threshold, then clean them up with explicit safety checks. A stale branch is not necessarily merged or safe to delete.

## Installation

Requires Node.js 18 or newer and Git.

```bash
npm install -g stale-branch-cli
npx --package=stale-branch-cli stale-branch list
```

## Usage

```bash
stale-branch                 # same as list
stale-branch list --days 30
stale-branch list --remote --json
stale-branch list --ignore 'feature/*,release/*'
stale-branch delete --dry-run
stale-branch delete --yes
stale-branch delete --force
stale-branch config
```

## Start in the correct Git repository

Run the command from the project repository you want to inspect:

```bash
cd /path/to/your/project
git status
stale-branch list
```

If `git status` says the directory is not a Git repository, change to the correct project directory. Useful checks are:

```bash
pwd
git rev-parse --show-toplevel
git branch -a
git remote -v
```

Update remote-tracking references before using `--remote`:

```bash
git fetch --all --prune
```

Options: `--days <n>`, `--remote`, `--json`, `--ignore <patterns>`, `--dry-run`, `--yes`/`-y`, `--delete-remote`, `--force`, `--help`/`-h`, and `--version`/`-v`. Flags may appear before or after the command. Repeat `--ignore` to add more patterns.

The default threshold is 90 days. A branch is stale only when its latest commit is older than the threshold. Results are sorted oldest first. The checked-out branch and `main`, `master`, `develop`, `production`, and `release` are always protected, including their remote-tracking counterparts.

Branch creation date does not determine whether a branch is stale. The latest commit date is used. An old branch with a commit from yesterday is not stale.

Inspect branch commit dates directly:

```bash
git for-each-ref \
  --sort=-committerdate \
  --format='%(refname:short) %(committerdate:iso8601)' \
  refs/heads/ refs/remotes/
```

## Complete command reference

List local branches:

```bash
stale-branch list
stale-branch
```

Use a custom threshold:

```bash
stale-branch list --days 30
stale-branch list --days 180
```

Use `--days 0` for testing:

```bash
stale-branch list --days 0
```

Include remote-tracking branches:

```bash
git fetch --all --prune
stale-branch list --remote
```

Print JSON for scripts:

```bash
stale-branch list --json
stale-branch list --remote --json
stale-branch list --days 30 --remote --json
```

If no branches qualify, `[]` or `No stale branches found.` is a successful result.

Ignore exact names or wildcard patterns:

```bash
stale-branch list --ignore experimental
stale-branch list --ignore 'feature/*'
stale-branch list --ignore 'feature/*,release/*,hotfix/*'
stale-branch list --ignore 'feature/*' --ignore 'experiment/*'
```

Show loaded and resolved configuration:

```bash
stale-branch config
```

## Deletion safety

Local deletion uses `git branch -d`, so Git refuses unmerged work. `--force` deliberately uses `git branch -D`; it never bypasses protected or current branches. `--yes` only skips confirmation and never enables force or remote deletion.

`--remote` includes remote-tracking references in discovery; it does not delete a server branch. Actual remote deletion requires `stale-branch delete --remote --delete-remote`. This runs `git push <remote> --delete <branch>` and requires confirmation unless `--yes` is supplied. `--dry-run` performs no Git mutations and shows the candidates that would be considered.

Preview deletion before changing anything:

```bash
stale-branch delete --dry-run
stale-branch delete --days 30 --dry-run
stale-branch delete --remote --dry-run
```

Delete local branches interactively:

```bash
stale-branch delete
```

Answer `y` or `yes` to approve. Any other answer cancels the operation. Skip confirmation only for a reviewed operation:

```bash
stale-branch delete --yes
```

Force-delete unmerged local branches explicitly:

```bash
stale-branch delete --force
```

Protected branches and the current branch cannot be deleted, even with `--force` or `--yes`.

Delete actual remote branches only with both explicit flags:

```bash
git fetch --all --prune
stale-branch delete --remote --delete-remote
stale-branch delete --remote --delete-remote --yes
```

`--remote` alone never deletes an actual server branch. `--yes` alone never enables remote deletion.

## Command-line options

| Option | Description |
| --- | --- |
| `--days <n>` | Non-negative integer stale threshold. Default: `90`. |
| `--remote` | Include remote-tracking branches. |
| `--json` | Print machine-readable JSON. |
| `--ignore <patterns>` | Add exact names or `*` wildcard patterns. Repeatable. |
| `--dry-run` | Preview deletion without modifying Git. |
| `--yes`, `-y` | Skip confirmation. Does not bypass safety rules. |
| `--delete-remote` | Permit actual remote deletion and enable remote discovery. |
| `--force` | Force-delete unmerged local branches. |
| `--help`, `-h` | Display usage information. |
| `--version`, `-v` | Display the package version. |

Options can appear before or after the command:

```bash
stale-branch --days 30 list --json
stale-branch list --days 30 --json
```

## Configuration

Create `.stale-branchrc` in the repository:

```json
{
  "days": 60,
  "includeRemote": false,
  "ignore": ["release/*", "hotfix/*"]
}
```

CLI values take precedence over the file and built-in defaults. Ignore patterns are merged and deduplicated. `config` prints both the file values and resolved values. Invalid JSON, types, or keys are reported as errors.

## API

```js
import { findStaleBranches, deleteBranches } from 'stale-branch-cli';

const stale = await findStaleBranches({ days: 90, includeRemote: false, ignore: ['release/*'] });
const result = await deleteBranches(stale, { force: false, deleteRemote: false });
```

`findStaleBranches()` returns objects containing `name`, full `ref`, `isRemote`, `remote`, `remoteBranch`, `lastCommit`, and `ageDays`. `deleteBranches()` returns `{ deleted, failed, skipped }` and independently validates branch references, protected branches, the current branch, and deletion options. Both accept an optional `cwd` for another repository.

## Troubleshooting

If you see `Not inside a Git repository`, check your directory and change into the project:

```bash
pwd
git status
cd /path/to/your/project
stale-branch list
```

If GitHub shows branches that the tool does not show, refresh remote-tracking references and include remote branches:

```bash
git fetch --all --prune
git branch -a
stale-branch list --remote --days 0 --json
```

If the result is empty, the command worked but no branch matched the threshold. Check commit dates with:

```bash
git for-each-ref \
  --sort=-committerdate \
  --format='%(refname:short) %(committerdate:iso8601)' \
  refs/heads/ refs/remotes/
```

Remember that the current branch and protected names such as `main` are intentionally excluded.

Check the installed version and available options:

```bash
stale-branch --version
stale-branch --help
```

## Development

```bash
npm test
npm pack --dry-run
```

The package has no runtime dependencies and uses Node's built-in test runner. To publish after reviewing the package contents:

```bash
npm login
npm publish
```

## License

MIT.
