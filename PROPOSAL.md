# Proposal: a second terminal client for Exo on OpenTUI

## Why

Exo's core speaks one protocol, and its terminal and web clients are both drawn from it. A protocol that serves two clients well should serve a third, and building one from outside the core is a direct way to find out what the protocol really promises. exo-tui is that third client: TypeScript on Anomaly's OpenTUI renderer, which brings native rendering, a test renderer that drives real frames, and mock keyboard input. Everything the client knows arrives through the adapter and the event stream, so each assumption it has to make about Exo becomes visible and can be written down, tested, or fed back into the protocol.

## Principles

**The core is the authority.** The client displays state and sends intents. An approval card closes only when the core resolves the matching request, and a successful send of an answer counts as receipt rather than closure. A refused answer is shown as refused.

**Approvals are bound and fail closed.** Exo ties every outward approval to the exact text, target and arguments. The client keeps that discipline at the keyboard: an answer names its request ID and binding, a confirmation belongs to one request, and any ambiguity about focus, modifiers or which request sits at the head resolves toward no answer at all. The Phase 1 work in the [roadmap](ROADMAP.md) makes this hold under the specific failures the first review found.

**State is a replayable log.** Events carry a global `seq`, the client applies them in order, ignores duplicates, and resubscribes from its last `seq` after a disconnect. The mock already exercises replay, so the live transport inherits a state model that has been tested against reordering and reconnection.

**The terminal is left as it was found.** Alternate screen, raw mode and the cursor are restored on exit, and diagnostics stay off the live frame. The pseudo-terminal test checks this on POSIX.

**The adapter is replaceable.** `protocol.ts` is the seam. The mock and a future HTTP/SSE or stdio adapter implement the same interface, so the interface and the transport can evolve separately.

## What it could become

- **Direction:** a lightweight client for watching and steering a running Exo seat from another terminal, including answering approvals with the same binding guarantees as the built-in client.
- **Direction:** a proving ground for protocol changes, where a new event type or approval field is exercised by an independent implementation before Exo's own clients depend on it.
- **Direction:** an accessible terminal path, with a screen-reader mode designed in from Phase 2.
- **Direction:** a reference for anyone writing their own Exo client, since its protocol notes separate what Exo specifies from what the client assumes.
