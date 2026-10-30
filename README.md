# exo-tui
Experimental alternative TUI for Exo, based off OpenTUI by @anomalyco

This is an early, **mock-only** TypeScript frontend experiment. It does not connect to Exo, launch the engine, call a provider, or perform an approval action. The existing Python engine and `python -m exo.cli serve` remain separate. Each input produces a streamed mock reply; the first input also starts a queue of scripted approval requests; the first answer to the first request is deliberately rejected. The mock includes replay for disconnect testing, not a network transport.

## Try it

Requires Bun 1.3.14 or newer and the dependencies, including OpenTUI's matching optional native package. `@opentui/core` is pinned to 0.7.0. On native Windows arm64 OpenTUI requires Bun 1.4.0 or later. OpenTUI also documents Node 26.4+ with experimental FFI, but this project currently uses Bun for running and testing. See [OpenTUI runtime support](https://opentui.com/docs/getting-started/runtime-support/).

```sh
bun install --frozen-lockfile
bun run start                    # explicit --mock is in this script
bun run plain                    # noninteractive fixed fixture, safe for pipes
bun test
bun run typecheck
```

Interactive mode requires a TTY and explicit `--mock`. Tab switches between composer and transcript. When the transcript has focus use arrows, Page Up/Down, Home and End. Ctrl+F focuses the approval controls without discarding the draft. `o` answers once; `d`, Enter denies; `a`, Enter allows always, if the request offers the option. Esc cancels a pending confirmation. Ctrl+Q or Ctrl+C exits. The focus label is visible. The plain fixture is not an interactive client or a screen-reader equivalent. Screen-reader support and terminal accessibility have not been established.

## Architecture and protocol boundary

`protocol.ts` defines an adapter for commands and an ordered event stream; `mock.ts` is its only implementation. `controller.ts` manages the cursor and command lifecycle; `state.ts` holds transcript and approval state; `ui.ts` owns the OpenTUI renderer. There is no engine in this repository.

The shapes are informed by [Exo protocol v1](https://github.com/Moissanite-Labs/exo/blob/main/src/exo/protocol/schema.py), [server transport](https://github.com/Moissanite-Labs/exo/blob/main/src/exo/server/app.py), and [UI behavior](https://github.com/Moissanite-Labs/exo/blob/main/docs/UI.md), inspected at schema blob `03a3cfd0da7dca5d369ff8f5bcf12593733a890c`, server blob `06e6c1ee6c2a872553638adca74992a030a29474`, and UI blob `1dc35c0bcaeb7835fc2956882708e1da9efe22b7`. Exo commands have `id`, `type`, and `body`; hello negotiates protocol 1; events carry a global `seq` and `events.subscribe(since)` replays later events. HTTP uses `POST /command` and `GET /events` SSE. Requests include `request_id`, options, approvers and binding; answers carry the ID and binding, and only matching closure removes the request. The core remains the authority and may reject an answer.

This is **not a compatible Exo client yet**: the mock's session, messages, ordering and response timing are invented, and no real handshake, SSE or stdio transport exists. It omits session lifecycle, message completion, signing, reconciliation through `approvals.list`, reconnection across server instance changes, and many event types. In particular, a refused answer is displayed but is not reconciled with the core. Never use this mock for real approvals. A future adapter must implement those requirements and validate actual payloads, reject protocol mismatches, own its connection lifecycle, and keep errors and diagnostics off the live terminal display. OpenTUI does not capture stderr automatically; child processes and future transports must route or buffer stderr rather than write over a frame.

## Verification and contribution

`bun test` covers ordered replay, duplicate events, Unicode strings, repeated inputs, distinct approval IDs, rejection and matching resolution. Native OpenTUI renderer tests cover keyboard focus and draft preservation, scrolling while streaming, resize, Unicode display, matching approval confirmation and cleanup. On POSIX, a Python 3 pseudo-terminal test also checks terminal mode restoration, alternate-screen exit and an empty stderr during a mock interaction; Windows skips that test. These checks ran on macOS arm64 with Bun 1.4.2. They do not establish behavior on other terminals or platforms, screen-reader support, or stderr handling for future subprocesses and transports. No accessibility claim is made. Please keep changes small and mock-only until the protocol transport has separate integration tests. Do not add live actions or provider calls to fixtures.

Roadmap: broaden terminal and accessibility testing; implement and test a v1 transport with replay and server-instance handling; reconcile pending approvals against the core; then add session selection and richer transcript events. Preserve Exo's existing CLI and service entry points.

OpenTUI is an independent project by Anomaly and is [MIT licensed](https://github.com/anomalyco/opentui/blob/main/LICENSE). This repository currently has no project license; dependency attribution does not grant one. Contributions should include tests and describe any protocol or terminal assumptions.
