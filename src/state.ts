import type { Event } from './protocol';

export type Approval = { requestId: string; summary: string; risk: string; binding: string; options: string[]; session: string | null; pending: boolean; error: string };
export type Line = { id: string; label: string; text: string };
export class State {
  seq = 0;
  lines: Line[] = [];
  approvals: Approval[] = [];
  status = 'connected';
  apply(event: Event): boolean {
    // A replay may repeat a delivered event. Gaps are valid for filtered feeds.
    if (!Number.isSafeInteger(event.seq) || event.seq <= this.seq) return false;
    this.seq = event.seq;
    const b = event.body;
    if (event.type === 'message.delta' && typeof b.message_id === 'string' && typeof b.text === 'string') {
      let line = this.lines.find(x => x.id === b.message_id);
      if (!line) { line = { id: b.message_id, label: 'exo', text: '' }; this.lines.push(line); }
      line.text += b.text;
    } else if (event.type === 'approval.requested' && typeof b.request_id === 'string' && typeof b.summary === 'string') {
      if (!this.approvals.some(x => x.requestId === b.request_id)) this.approvals.push({
        requestId: b.request_id, summary: b.summary, risk: typeof b.risk === 'string' ? b.risk : 'medium',
        binding: typeof b.binding === 'string' ? b.binding : '', options: Array.isArray(b.options) ? b.options.filter((x): x is string => typeof x === 'string') : ['allow', 'deny', 'allow_always'],
        session: event.session, pending: false, error: ''
      });
    } else if (event.type === 'approval.resolved' && typeof b.request_id === 'string') {
      this.approvals = this.approvals.filter(x => x.requestId !== b.request_id);
    } else if (event.type === 'notice' && typeof b.text === 'string') {
      this.lines.push({ id: event.id, label: 'notice', text: b.text });
    }
    return true;
  }
  addUser(id: string, text: string) { this.lines.push({ id, label: 'you', text }); }
  reject(id: string, message: string) { const a = this.approvals.find(x => x.requestId === id); if (a) { a.pending = false; a.error = message; } }
}
