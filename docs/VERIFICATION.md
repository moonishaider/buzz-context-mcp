# Verification status

Private alpha. Public release is not approved.

Local macOS ARM64/Node 24.14 checks exercise types, lint, build, synthetic signed-relay isolation, same-second pagination, bounded text/PDF/Office extraction, native credential storage/removal and real MCP STDIO subprocess calls. Exact-commit suite results will be recorded separately.

Installed Codex successfully called the synthetic server, retrieved an allowed marker and received ACCESS_DENIED for a different user's private channel. Temporary config and an ephemeral session were used.

Installed Claude Code connected to the same synthetic server using an isolated project config. Model-driven Claude calls are pending authorization of the test account. A handshake is not end-to-end acceptance.

Cross-platform CI passed at 9dc1185730eda92e082da1ad3f74c6919a582f99: macOS, Windows and Ubuntu package checks, macOS/Windows native credential tests and a Linux Secret Service integration job. [Exact run](https://github.com/moonishaider/buzz-context-mcp/actions/runs/38473326962). Subsequent thread/upstream-fixture changes require their own passing CI record. No human Buzz identity was provisioned. Actual Buzz relay ACL tests and live human/UI parity are not completed.

Release requires full checks at the reviewed commit on three operating systems, native secure-store checks, real-client evidence for each stable combination, actual-relay isolation plus the first-human pilot, documented encryption/edit/thread limits, artifact/dependency review and explicit public-publishing authorization.

Synthetic passes are not a claim of perfect, universal or complete live workspace coverage.

An actual-relay CI job now targets the official public Buzz 0.2.1 Linux image at digest sha256:848fbf014382f152f126af5c85437cdcbe4f205126ef9a89f5f0133a421a2cfa (OCI revision 6e5c462ac524de60d7edb46c66130fd779cc9006). It binds only runner loopback and uses disposable identities/databases. It is pending, not a pass. This image is distinct from the source snapshot used for design research and from any unverified live deployment.

Full local package checks at d19c1adecae238ed9ed59e716a68ff953e2d40ad passed all 19 tests on macOS ARM64/Node 24.14, including native credential storage/removal and direct/nested Buzz thread-marker regression. The CI result at this code state is tracked separately.
