# Roadmap

Each phase lands through reviewed pull requests with tests. Exo's existing CLI and service entry points stay as they are throughout.

## Phase 0: Mock frontend

Status: open as [PR #1](https://github.com/Moissanite-Labs/exo-tui/pull/1), with changes requested in review.

Streaming transcript, composer, keyboard focus, scripted approval queue, replaceable adapter and sequence-based state. Nine `bun test` tests, including the POSIX pseudo-terminal test, and the typecheck pass on macOS arm64 with Bun 1.4.2.

## Phase 1: Approvals fail closed

The review on PR #1 found ways a keystroke could grant an approval the user did not mean to give or did not see. This is the interaction model a live transport will inherit, so it is fixed first. Milestones, taken from that review:

1. Take focus from the renderer (or turn off click auto-focus) instead of a separate local variable.
2. Require no modifiers for `o`, `d` and `a`.
3. Change the controller method to `respond(requestId, decision)` and check the ID against the head of the queue.
4. Clear any armed confirmation on every decision.
5. Clear `pending` in a `finally`, so a rejected command cannot block the queue.
6. Validate approval payloads strictly: a missing or malformed `risk` or `options` marks the request invalid, and a malformed request stays visible.
7. Then the should-fix items: a resizable approval panel so the action line stays in view, keeping the composer text when a send cannot proceed, a redraw when Enter clears a confirmation, per-send error IDs, `connecting` status until hello completes, one resolution per request in the mock, pasted multi-line input, and keypad Enter.

Milestone: each case reproduced in a test, then fixed, then merge.

## Phase 2: Terminal and accessibility coverage

Broaden testing across terminals and platforms, establish a screen-reader path, and fix the narrow-width help line that hides the Ctrl+Q hint. Milestone: a documented matrix of tested terminals and platforms with results.

## Phase 3: Exo v1 transport

A real adapter for the hello handshake, `POST /command` and `GET /events` SSE (or stdio), replay from `seq`, handling of server-instance changes, and its own connection lifecycle, with payload validation and protocol-mismatch rejection. Child processes and transports route or buffer stderr away from the live frame. Milestone: integration tests against a running `exo serve`, kept separate from the mock tests.

## Phase 4: Approval reconciliation

Reconcile pending approvals with the core through `approvals.list`, carry signing and binding through answers, and reconcile a refused answer with core state. Milestone: an end-to-end approval round trip against Exo's gate in a test environment.

## Phase 5: Sessions and richer transcript

Session selection and lifecycle, message completion, and the wider set of Exo event types in the transcript. Direction: incremental redraws, so rendering cost stays flat as the transcript grows.
