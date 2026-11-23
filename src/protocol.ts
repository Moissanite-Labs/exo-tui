/** The subset of Exo protocol v1 used by the experiment. This is not a transport. */
export type Command = { id: string; type: string; body: Record<string, unknown> };
export type Event = { id: string; seq: number; session: string | null; type: string; ts: string; body: Record<string, unknown> };
export type Response = { id: string; ok: boolean; result: Record<string, unknown>; error: { code: string; message: string; retryable: boolean } | null };
export interface Adapter {
  command(command: Command): Promise<Response>;
  /** Replay strictly after since, then deliver live events. Returns an unsubscribe function. */
  subscribe(since: number, receive: (event: Event) => void): () => void;
  close(): void;
}
let nextId = 0;
export function command(type: string, body: Record<string, unknown>): Command {
  return { id: `tui_${++nextId}`, type, body };
}
