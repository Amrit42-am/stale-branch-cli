export class StaleBranchError extends Error {
  constructor(message, code = 'STALE_BRANCH_ERROR', cause) {
    super(message, { cause });
    this.name = 'StaleBranchError';
    this.code = code;
  }
}

export class GitCommandError extends StaleBranchError {
  constructor(message, { command, args = [], stderr = '', exitCode = null, cause } = {}) {
    super(message, 'GIT_ERROR', cause);
    this.name = 'GitCommandError';
    this.command = command;
    this.args = args;
    this.stderr = stderr;
    this.exitCode = exitCode;
  }
}

export class ConfigError extends StaleBranchError {
  constructor(message, cause) { super(message, 'CONFIG_ERROR', cause); this.name = 'ConfigError'; }
}

export class InvalidArgumentError extends StaleBranchError {
  constructor(message) { super(message, 'INVALID_ARGUMENT'); this.name = 'InvalidArgumentError'; }
}

export class RepositoryError extends StaleBranchError {
  constructor(message, cause) { super(message, 'REPOSITORY_ERROR', cause); this.name = 'RepositoryError'; }
}
