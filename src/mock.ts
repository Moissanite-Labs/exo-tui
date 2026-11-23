import type { Adapter, Command, Event, Response } from './protocol';

/** Local fixtures only. Never opens a socket, starts a process, or performs an action. */
export class MockAdapter implements Adapter {
  private events: Event[] = [];
  private listeners = new Set<(e: Event) => void>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private n = 0;
  private fixtureStarted = false;
  private rejected = new Set<string>();
  private closed = false;
  private emit(type: string, body: Record<string, unknown>, session: string | null = 'mock-session') {
    if (this.closed) return;
    const seq = this.events.length + 1;
    const event = { id: `mock-e${seq}`, seq, type, body, session, ts: new Date(0).toISOString() };
    this.events.push(event);
    for (const listener of this.listeners) listener(event);
  }
  private later(fn: () => void, delay: number) {
    const timer = setTimeout(() => { this.timers.delete(timer); fn(); }, delay);
    this.timers.add(timer);
  }
  subscribe(since: number, receive: (event: Event) => void) {
    // Register first so no event is lost between replay and live delivery.
    this.listeners.add(receive);
    for (const e of this.events) if (e.seq > since) receive(e);
    return () => this.listeners.delete(receive);
  }
  async command(c: Command): Promise<Response> {
    const ok = (result: Record<string, unknown> = {}): Response => ({ id: c.id, ok: true, result, error: null });
    const fail = (message: string): Response => ({ id: c.id, ok: false, result: {}, error: { code: 'mock_rejected', message, retryable: true } });
    if (this.closed) return fail('Mock disconnected');
    if (c.type === 'hello') return c.body.protocol === 1 ? ok({ protocol: 1, server: 'mock', capabilities: ['replay'], seq: this.events.length, instance: 'mock-instance' }) : fail('Protocol mismatch');
    if (c.type === 'turn.send') {
      const id = `mock-m${++this.n}`;
      const text = typeof c.body.text === 'string' ? c.body.text : '';
      this.later(() => this.emit('message.delta', { message_id: id, text: 'Mock reply to “' + text + '”: ' }), 30);
      this.later(() => this.emit('message.delta', { message_id: id, text: 'streaming works. 船 🚢' }), 180);
      if (!this.fixtureStarted) {
        this.fixtureStarted = true;
        this.later(() => this.emit('approval.requested', { request_id: 'mock-a1', summary: 'Fixture: inspect a local imaginary file', risk: 'medium', binding: 'mock-binding-1', options: ['allow', 'deny', 'allow_always'] }), 250);
        this.later(() => this.emit('approval.requested', { request_id: 'mock-a2', summary: 'Fixture: second queued request', risk: 'high', binding: 'mock-binding-2', options: ['allow', 'deny'] }), 300);
      }
      return ok();
    }
    if (c.type === 'approval.respond') {
      const id = c.body.request_id;
      const requested = this.events.find(e => e.type === 'approval.requested' && e.body.request_id === id);
      const resolved = this.events.some(e => e.type === 'approval.resolved' && e.body.request_id === id);
      if (!requested || resolved || requested.body.binding !== c.body.binding || !Array.isArray(requested.body.options) || !requested.body.options.includes(c.body.decision)) return fail('Request is closed or answer is invalid');
      if (id === 'mock-a1' && !this.rejected.has(id)) { this.rejected.add(id); return fail('Scripted rejection; request remains open'); }
      this.later(() => this.emit('approval.resolved', { request_id: id, decision: c.body.decision, by: 'mock' }), 50);
      return ok();
    }
    return fail('Unsupported mock command');
  }
  close() { this.closed = true; for (const timer of this.timers) clearTimeout(timer); this.timers.clear(); this.listeners.clear(); }
}
