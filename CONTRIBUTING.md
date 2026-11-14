# Contributing

Moissanite Labs repositories follow the lab's GitHub operating procedure in [eth0s `sops/github.md`](https://github.com/Moissanite-Labs/eth0s/blob/main/sops/github.md) (internal, team only): every pull request links the issue that states the problem, work lands through reviewed pull requests rather than direct pushes to `main`, and the author of a code change does not merge it.

For this repository:

- Run `bun test` and `bun run typecheck` before opening a pull request. The pseudo-terminal test needs Python 3 on POSIX.
- Keep changes small and include tests. Describe any protocol or terminal assumption the change relies on.
- Keep fixtures local and mock-only until the protocol transport has its own integration tests; fixtures perform no live actions or provider calls.
- Approval changes fail closed: when focus, modifiers or request identity are ambiguous, the client sends nothing.
