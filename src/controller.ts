import { command, type Adapter, type Event } from './protocol';
import { State } from './state';

export class Controller {
  readonly state = new State();
  private stop?: () => void;
  private listeners = new Set<() => void>();
  private userId = 0;
  constructor(private adapter: Adapter) {}
  onChange(fn: () => void) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  private changed() { for (const fn of this.listeners) fn(); }
  async connect() {
    const response = await this.adapter.command(command('hello', { protocol: 1, client: 'exo-tui', capabilities: [] }));
    if (!response.ok || response.result.protocol !== 1) throw new Error(response.error?.message ?? 'Protocol mismatch');
    this.reconnect();
  }
  reconnect() { this.stop?.(); this.state.status = 'connected'; this.stop = this.adapter.subscribe(this.state.seq, (e: Event) => { if (this.state.apply(e)) this.changed(); }); this.changed(); }
  disconnect() { this.stop?.(); this.stop = undefined; this.state.status = 'disconnected'; this.changed(); }
  async send(text: string) {
    if (!text.trim() || this.state.status !== 'connected') return;
    this.state.addUser(`user-${++this.userId}`, text); this.changed();
    const result = await this.adapter.command(command('turn.send', { session: 'mock-session', text, mode: 'send' }));
    if (!result.ok) { this.state.lines.push({ id: `error-${this.userId}`, label: 'error', text: result.error?.message ?? 'Send failed' }); this.changed(); }
  }
  async respond(decision: string) {
    const a = this.state.approvals[0];
    if (!a || a.pending || this.state.status !== 'connected' || !a.options.includes(decision)) return;
    a.pending = true; a.error = ''; this.changed();
    const result = await this.adapter.command(command('approval.respond', { request_id: a.requestId, binding: a.binding, decision }));
    // A success is only receipt, not closure. A matching resolution closes the card.
    if (!result.ok) { this.state.reject(a.requestId, result.error?.message ?? 'Answer rejected'); this.changed(); }
  }
  close() { this.stop?.(); this.adapter.close(); this.listeners.clear(); }
}
