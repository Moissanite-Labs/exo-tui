# Open questions

1. **First transport.** HTTP with `POST /command` and SSE, or stdio to a child process? Each has different reconnection and stderr handling.
2. **Relationship to Exo's built-in client.** Exo already ships a terminal client (`exo`, the same as `exo tui`). Should exo-tui aim for parity, for a narrower role such as a companion or approval console, or for testing protocol changes?
3. **Approval key scheme.** After Phase 1, which keys and confirmation steps give fast answers while staying fail closed, and should `allow always` always require a second step?
4. **Runtime.** Stay on Bun, or also support Node with OpenTUI's experimental FFI?
5. **Accessibility target.** Which screen readers and terminals define "supported" for Phase 2?
6. **Signing.** Exo seats sign their answers. Does the client hold a signing key, or does the core sign on its behalf?
7. **Licence.** Which licence should the repository carry?
