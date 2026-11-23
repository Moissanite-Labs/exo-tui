import { BoxRenderable, InputRenderable, InputRenderableEvents, ScrollBoxRenderable, TextRenderable, createCliRenderer, type CliRenderer } from '@opentui/core';
import { Controller } from './controller';

export function mountUI(renderer: CliRenderer, controller: Controller) {
  const root = new BoxRenderable(renderer, { width: '100%', height: '100%', flexDirection: 'column' });
  const header = new TextRenderable(renderer, { content: 'EXO TUI  ·  MOCK ONLY', fg: '#f5a25d' });
  const transcript = new ScrollBoxRenderable(renderer, { width: '100%', flexGrow: 1, stickyScroll: true, stickyStart: 'bottom' });
  const approval = new TextRenderable(renderer, { content: '', fg: '#f5a25d', width: '100%', height: 4, flexShrink: 0 });
  const help = new TextRenderable(renderer, { content: '', fg: '#b8c0cc', width: '100%' });
  const input = new InputRenderable(renderer, { width: '100%', placeholder: 'Message (mock only)', focusedBackgroundColor: '#303640' });
  const rows = new Map<string, TextRenderable>();
  let focus: 'composer' | 'transcript' | 'approval' = 'composer';
  let confirm: { requestId: string; decision: string } | undefined;
  const changeFocus = (next: typeof focus) => {
    focus = next; confirm = undefined;
    if (focus === 'composer') input.focus();
    else if (focus === 'transcript') transcript.focus();
    else { input.blur(); transcript.blur(); }
    draw();
  };
  const draw = () => {
    for (const line of controller.state.lines) {
      let row = rows.get(line.id);
      if (!row) { row = new TextRenderable(renderer, { id: line.id, width: '100%', content: '' }); rows.set(line.id, row); transcript.add(row); }
      row.content = `${line.label} › ${line.text}\n`;
    }
    const a = controller.state.approvals[0];
    if (confirm && confirm.requestId !== a?.requestId) confirm = undefined;
    approval.content = a ? `APPROVAL · ${a.risk} · ${a.requestId} (${controller.state.approvals.length} queued)\n${a.summary}\n${confirm ? `Press Enter to confirm ${confirm.decision}; Esc cancels` : a.pending ? 'Waiting for resolution' : a.error || 'Ctrl+F to focus; o allow once; d then Enter deny; a then Enter always'}` : 'No pending approvals';
    help.content = `FOCUS: ${focus.toUpperCase()} · ${controller.state.status} · Tab: composer/transcript · Ctrl+F: approval · Ctrl+Q: quit`;
  };
  root.add(header); root.add(transcript); root.add(approval); root.add(help); root.add(input); renderer.root.add(root);
  const off = controller.onChange(draw);
  input.on(InputRenderableEvents.ENTER, (value: string) => { if (focus !== 'composer' || !value.trim()) return; input.value = ''; void controller.send(value); });
  const onKey = (key: import('@opentui/core').KeyEvent) => {
    if (key.ctrl && key.name === 'q') { key.preventDefault(); renderer.destroy(); return; }
    if (key.ctrl && key.name === 'f') { key.preventDefault(); changeFocus('approval'); return; }
    if (key.name === 'tab') { key.preventDefault(); changeFocus(focus === 'composer' ? 'transcript' : 'composer'); return; }
    if (focus !== 'approval') return;
    if (key.name === 'escape') { confirm = undefined; draw(); return; }
    if (key.name === 'o') { void controller.respond('allow'); return; }
    if (key.name === 'd' || key.name === 'a') { const a = controller.state.approvals[0]; if (a) confirm = { requestId: a.requestId, decision: key.name === 'd' ? 'deny' : 'allow_always' }; draw(); return; }
    if (key.name === 'return' && confirm && confirm.requestId === controller.state.approvals[0]?.requestId) { const decision = confirm.decision; confirm = undefined; void controller.respond(decision); }
  };
  renderer.keyInput.on('keypress', onKey);
  changeFocus('composer');
  const dispose = () => { off(); renderer.keyInput.off('keypress', onKey); renderer.off('destroy', dispose); };
  renderer.once('destroy', dispose);
  return { transcript, input, dispose };
}

export async function runUI(controller: Controller) {
  const renderer = await createCliRenderer({ exitOnCtrlC: true });
  let ui: ReturnType<typeof mountUI> | undefined;
  try {
    ui = mountUI(renderer, controller);
    await controller.connect();
    await renderer.closed;
  } finally { ui?.dispose(); controller.close(); renderer.destroy(); await renderer.closed; }
}
