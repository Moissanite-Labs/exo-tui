import { Controller } from './controller';
import { MockAdapter } from './mock';

const args = process.argv.slice(2);
if (!args.includes('--mock') || args.some(x => !['--mock', '--plain'].includes(x))) {
  process.stderr.write('Usage: bun src/index.ts --mock [--plain]\n');
  process.exitCode = 2;
} else if (args.includes('--plain')) {
  process.stdout.write('EXO TUI · mock fixture only\nyou › Hello\nexo › Mock reply: streaming works. 船 🚢\n');
} else if (!process.stdin.isTTY || !process.stdout.isTTY) {
  process.stderr.write('Interactive mode needs a terminal. Use --mock --plain for a non-interactive fixture.\n');
  process.exitCode = 2;
} else {
  const controller = new Controller(new MockAdapter());
  try { const { runUI } = await import('./ui'); await runUI(controller); }
  catch (error) { controller.close(); process.stderr.write(`exo-tui: ${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
