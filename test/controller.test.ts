import { describe, expect, test } from 'bun:test';
import { Controller } from '../src/controller';
import { MockAdapter } from '../src/mock';
import { State } from '../src/state';
import type { Event } from '../src/protocol';
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const event = (seq: number, type: string, body: Record<string, unknown>): Event => ({ id: `e${seq}`, seq, type, body, session: null, ts: '' });

describe('event state', () => {
  test('replay is idempotent, unknown events advance cursor, and Unicode deltas append', () => {
    const s = new State();
    s.apply(event(1, 'message.delta', { message_id: 'm', text: '船' }));
    s.apply(event(1, 'message.delta', { message_id: 'm', text: 'duplicate' }));
    s.apply(event(3, 'future.event', {}));
    s.apply(event(4, 'message.delta', { message_id: 'm', text: ' 🚢' }));
    expect(s.lines[0]?.text).toBe('船 🚢'); expect(s.seq).toBe(4);
  });
  test('late resolution closes only its own request', () => {
    const s = new State();
    for (const [seq, id] of [[1, 'a'], [2, 'b']] as const) s.apply(event(seq, 'approval.requested', { request_id: id, summary: id, binding: id }));
    s.apply(event(3, 'approval.resolved', { request_id: 'a' }));
    s.apply(event(4, 'approval.resolved', { request_id: 'a' }));
    expect(s.approvals.map(a => a.requestId)).toEqual(['b']);
  });
});
describe('mock controller', () => {
  test('repeated inputs, disconnect replay, rejection, and resolution', async () => {
    const c = new Controller(new MockAdapter());
    try {
      await c.connect(); await c.send('first'); await c.send('second'); c.disconnect(); await wait(350);
      expect(c.state.seq).toBe(0); c.reconnect();
      expect(c.state.lines.filter(x => x.label === 'exo').map(x => x.text)).toEqual(['Mock reply to “first”: streaming works. 船 🚢', 'Mock reply to “second”: streaming works. 船 🚢']);
      expect(c.state.approvals.map(x => x.requestId)).toEqual(['mock-a1', 'mock-a2']);
      await c.respond('deny'); expect(c.state.approvals[0]?.error).toContain('rejection');
      await c.respond('deny'); expect(c.state.approvals[0]?.pending).toBe(true); await wait(100);
      expect(c.state.approvals.map(x => x.requestId)).toEqual(['mock-a2']);
      await c.respond('allow_always'); expect(c.state.approvals[0]?.pending).toBe(false);
      await c.respond('allow'); await wait(100); expect(c.state.approvals).toEqual([]);
    } finally { c.close(); }
  });
});
