import readline from 'node:readline';

export function confirm(message, { input = process.stdin, output = process.stdout } = {}) {
  if (!input.isTTY || !output.isTTY) return Promise.resolve(false);
  const rl = readline.createInterface({ input, output });
  return new Promise((resolve) => rl.question(`${message} (y/N) `, (answer) => { rl.close(); resolve(/^y(es)?$/i.test(answer.trim())); }));
}
