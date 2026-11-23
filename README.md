# exo-tui

An experimental alternative terminal frontend for [Exo](https://github.com/Moissanite-Labs/exo), built on [OpenTUI](https://github.com/anomalyco/opentui) by Anomaly.

Exo is a coding agent with one continuous memory, a gate that ties each outward approval to the exact text the user saw, and terminal and web clients drawn from one protocol. exo-tui explores a second terminal client written in TypeScript on OpenTUI's renderer, shaped from the start around Exo protocol v1: an adapter for commands, an ordered event stream with sequence-based replay, and approval cards that close only when the core resolves the matching request. Today it runs against a local mock adapter that scripts the conversation and the approval queue, which makes it a testbed for the interaction model ahead of a live transport; use it for design and testing, never for real approvals.

## What it does now

- A streaming transcript, a composer, visible keyboard focus and a scripted approval queue.
- Sequence-based state with replay, exercised by a disconnect-and-replay mock.
- Approval answers carry the request ID and binding; a confirmation is tied to its request, and the first answer to the first request is deliberately rejected to exercise refusal.
- A plain, noninteractive fixture that is safe to pipe.
- Tests against the real OpenTUI renderer, plus a POSIX pseudo-terminal test for terminal restoration.

## Try it

Requires Bun 1.3.14 or newer and the dependencies, including OpenTUI's matching optional native package. `@opentui/core` is pinned to 0.7.0. On native Windows arm64 OpenTUI requires Bun 1.4.0 or later. OpenTUI also documents Node 26.4+ with experimental FFI; this project uses Bun for running and testing. See [OpenTUI runtime support](https://opentui.com/docs/getting-started/runtime-support/).

```sh
bun install --frozen-lockfile
bun run start                    # explicit --mock is in this script
bun run plain                    # noninteractive fixed fixture, safe for pipes
bun test
bun run typecheck
```

Interactive mode requires a TTY and explicit `--mock`. Tab switches between composer and transcript. When the transcript has focus use arrows, Page Up/Down, Home and End. Ctrl+F focuses the approval controls and keeps the draft. `o` answers once; `d`, Enter denies; `a`, Enter allows always, when the request offers that option. Esc cancels a pending confirmation. Ctrl+Q or Ctrl+C exits. The approval keys are under revision (see the [roadmap](ROADMAP.md)).

## Architecture

`protocol.ts` defines the adapter for commands and the ordered event stream, and `mock.ts` implements it with local fixtures. `controller.ts` manages the cursor and the command lifecycle, `state.ts` holds transcript and approval state, and `ui.ts` owns the OpenTUI renderer. The engine stays in Exo; Exo's existing CLI and `python -m exo.cli serve` entry points are untouched.

The shapes follow [Exo protocol v1](https://github.com/Moissanite-Labs/exo/blob/main/src/exo/protocol/schema.py), the [server transport](https://github.com/Moissanite-Labs/exo/blob/main/src/exo/server/app.py) and [UI behaviour](https://github.com/Moissanite-Labs/exo/blob/main/docs/UI.md), inspected at schema blob `03a3cfd`, server blob `06e6c1e` and UI blob `1dc35c0`. Exo commands have `id`, `type` and `body`; hello negotiates protocol 1; events carry a global `seq`, and `events.subscribe(since)` replays later events. HTTP uses `POST /command` and `GET /events` SSE. Approval requests include `request_id`, options, approvers and binding; answers carry the ID and binding, only matching closure removes a request, and the core remains the authority that may reject an answer.

The mock's session, messages, ordering and timing are its own inventions. The live adapter is planned to implement the real handshake, SSE or stdio transport, session lifecycle, message completion, signing, reconciliation through `approvals.list` and reconnection across server instances, and to route stderr away from the live frame, since OpenTUI leaves stderr to the application.

## Where it is going

The [roadmap](ROADMAP.md) runs from making approvals fail closed, through terminal and accessibility testing, to a real v1 transport, approval reconciliation with the core, and then session selection and richer transcript events. The [proposal](PROPOSAL.md) sets out why a second terminal client is worth building and the principles it holds to; [open questions](OPEN_QUESTIONS.md) lists the decisions ahead.

## Licence and contributing

OpenTUI is an independent project by Anomaly, [MIT licensed](https://github.com/anomalyco/opentui/blob/main/LICENSE). The licence for this repository is still to be chosen. See [CONTRIBUTING.md](CONTRIBUTING.md).
