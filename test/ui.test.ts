import { describe, expect, test } from 'bun:test';
import { createTestRenderer } from '@opentui/core/testing';
import type { Adapter, Command, Event, Response } from '../src/protocol';
import { Controller } from '../src/controller';
import { mountUI } from '../src/ui';

class Feed implements Adapter {
  private listener?: (event: Event) => void;
  private seq = 0;
  closed = false;
  commands: Command[] = [];
  async command(c: Command): Promise<Response> { this.commands.push(c); return { id: c.id, ok: true, result: c.type === 'hello' ? { protocol: 1 } : {}, error: null }; }
  subscribe(_since: number, receive: (event: Event) => void) { this.listener = receive; return () => { this.listener = undefined; }; }
  emit(type: string, body: Record<string, unknown>) { this.listener?.({ id: `e${++this.seq}`, seq: this.seq, type, body, session: 'mock-session', ts: '' }); }
  close() { this.closed = true; this.listener = undefined; }
}

describe('native renderer', () => {
  test('keyboard focus preserves draft and submit supports repeated input', async () => {
    const setup = await createTestRenderer({ width: 90, height: 24 });
    const feed = new Feed(); const c = new Controller(feed); const ui = mountUI(setup.renderer, c);
    try {
      await c.connect(); await setup.renderOnce();
      await setup.mockInput.typeText('draft'); setup.mockInput.pressTab(); await setup.renderOnce();
      expect(setup.captureCharFrame()).toContain('FOCUS: TRANSCRIPT');
      setup.mockInput.pressKey('f', { ctrl: true }); await setup.renderOnce();
      expect(setup.captureCharFrame()).toContain('FOCUS: APPROVAL');
      setup.mockInput.pressTab(); await setup.renderOnce();
      expect(ui.input.value).toBe('draft');
      setup.mockInput.pressEnter(); await setup.renderOnce();
      await setup.mockInput.typeText('second'); setup.mockInput.pressEnter(); await setup.renderOnce();
      expect(c.state.lines.filter(x => x.label === 'you').map(x => x.text)).toEqual(['draft', 'second']);
      expect(ui.input.value).toBe('');
    } finally { ui.dispose(); c.close(); await setup.dispose(); }
    expect(feed.closed).toBe(true);
  });
  test('streaming while scrolled up stays in place through resize and Unicode renders', async () => {
    const setup = await createTestRenderer({ width: 70, height: 18 });
    const feed = new Feed(); const c = new Controller(feed); const ui = mountUI(setup.renderer, c);
    try {
      await c.connect();
      for (let i = 0; i < 30; i++) feed.emit('message.delta', { message_id: `m${i}`, text: `line ${i}` });
      await setup.renderOnce(); ui.transcript.scrollTo(0); await setup.renderOnce();
      expect(ui.transcript.scrollTop).toBe(0);
      expect(setup.captureCharFrame()).toContain('line 0');
      feed.emit('message.delta', { message_id: 'm29', text: ' 船 🚢' });
      await setup.renderOnce(); expect(ui.transcript.scrollTop).toBe(0);
      setup.resize(60, 16); await setup.renderOnce(); expect(ui.transcript.scrollTop).toBe(0);
      ui.transcript.scrollTo(Infinity); await setup.renderOnce();
      const frame = setup.captureCharFrame(); expect(frame).toContain('line 29'); expect(frame).toContain('船');
    } finally { ui.dispose(); c.close(); await setup.dispose(); }
  });
  test('a confirmation cannot answer a replacement approval', async () => {
    const setup = await createTestRenderer({ width: 90, height: 24 });
    const feed = new Feed(); const c = new Controller(feed); const ui = mountUI(setup.renderer, c);
    try {
      await c.connect();
      feed.emit('approval.requested', { request_id: 'a1', summary: 'First fixture', binding: 'one', options: ['allow', 'deny'] });
      feed.emit('approval.requested', { request_id: 'a2', summary: 'Second fixture', binding: 'two', options: ['allow', 'deny'] });
      await setup.renderOnce(); setup.mockInput.pressKey('f', { ctrl: true }); setup.mockInput.pressKey('d'); await setup.flush();
      expect(setup.captureCharFrame()).toContain('Press Enter to confirm deny');
      feed.emit('approval.resolved', { request_id: 'a1', decision: 'deny' });
      await setup.renderOnce(); setup.mockInput.pressEnter(); await setup.renderOnce();
      expect(feed.commands.filter(x => x.type === 'approval.respond')).toEqual([]);
      setup.mockInput.pressKey('o'); await setup.renderOnce();
      const response = feed.commands.find(x => x.type === 'approval.respond');
      expect(response?.body).toEqual({ request_id: 'a2', binding: 'two', decision: 'allow' });
      expect(c.state.approvals[0]?.pending).toBe(true);
      feed.emit('approval.resolved', { request_id: 'a2', decision: 'allow' });
      expect(c.state.approvals).toEqual([]);
    } finally { ui.dispose(); c.close(); await setup.dispose(); }
  });
  test('Ctrl+Q destroys the renderer and closes its native resources', async () => {
    const setup = await createTestRenderer({ width: 70, height: 20 });
    const feed = new Feed(); const c = new Controller(feed); const ui = mountUI(setup.renderer, c);
    try {
      await c.connect(); await setup.renderOnce(); setup.mockInput.pressKey('q', { ctrl: true });
      await setup.renderer.closed;
      expect(() => feed.emit('message.delta', { message_id: 'late', text: 'after shutdown' })).not.toThrow();
    } finally { ui.dispose(); c.close(); await setup.dispose(); }
    expect(feed.closed).toBe(true);
  });
});

test('plain fixture works without a TTY or renderer', async () => {
  const proc = Bun.spawn(['bun', 'src/index.ts', '--mock', '--plain'], { stdout: 'pipe', stderr: 'pipe' });
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  expect(code).toBe(0); expect(out).toContain('mock fixture only'); expect(out).toContain('船'); expect(err).toBe('');
});

test.skipIf(process.platform === 'win32')('real PTY restores terminal and leaves stderr clean', async () => {
  const proc = Bun.spawn(['python3', 'test/terminal_pty.py'], { stdout: 'pipe', stderr: 'pipe' });
  const [out, err, code] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text(), proc.exited]);
  expect({ code, out, err }).toEqual({ code: 0, out: '', err: '' });
}, 12000);
