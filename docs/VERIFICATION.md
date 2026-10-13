# Verification status

Private alpha. Public release is not approved. Implementation is on the feature branch and draft PR; main remains initialization-only.

Full local package checks at d19c1adecae238ed9ed59e716a68ff953e2d40ad passed all 19 tests on macOS ARM64/Node 24.14, including native credential storage/removal, bounded extraction, protocol isolation, pagination and direct/nested thread-marker regression. Production source has not changed since that check.

At e336bded297177197675b22dea3619b048d5d91d all five CI jobs passed: macOS, Windows and Ubuntu package checks, native secure-store checks (including Linux Secret Service), and the official Buzz 0.2.1 disposable-relay access tests. [Exact run](https://github.com/moonishaider/buzz-context-mcp/actions/runs/38475710829).

Actual-relay checks covered private histories, direct-ID denial, negative search, threads, parent access denial, membership removal/revocation and DM isolation. The relay image is pinned to sha256:848fbf014382f152f126af5c85437cdcbe4f205126ef9a89f5f0133a421a2cfa (OCI revision 6e5c462ac524de60d7edb46c66130fd779cc9006). No production relay was changed.

The strengthened real-relay test additionally checks positive search, own-DM discovery and uploaded-image retrieval. At cbbe45df385a53758d92079a12b17823d8622f15 image upload and parent creation reached extraction, but the parser subprocess exited because this independent CI job omitted the build step. The workflow now builds before integration. Its new result is pending; it is not yet a passing attachment acceptance claim.

Installed Codex performed real model/tool calls against synthetic content: allowed retrieval succeeded and another user's private channel returned ACCESS_DENIED. Installed Claude Code completed an isolated MCP handshake. Claude model-driven testing is pending authorization to use the currently logged-in company account, or a personal login. No company-account model request was made.

No human Buzz key was provisioned or real-client workflow tested on every OS. Human/UI parity, supported encryption/edit/thread limits and final release review remain required. Both repositories stay private; no package is published. Synthetic and fixture passes do not establish perfect or complete live coverage.
