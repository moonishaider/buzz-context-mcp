# Release review

## Distribution decision

The maintainer authorized correcting all three repositories and making **buzz-context-mcp** and **buzz-context-skills** public on October 15, 2026 (local date). **buzz-context-mcp-docs remains private.** Distribution is reviewed default-branch source, version **0.1.0-alpha.3**, under the existing Apache-2.0 license. No npm publication is needed; `private: true` prevents accidental registry publication and does not make GitHub source private.

## Product and acceptance

The merged connector provides 13 read-only tools, local browser/Terminal provisioning, OS credential storage, readable-source guidance and complete supported document text through bounded continuation. See VERIFICATION.md for exact code/CI references. Public documentation and optional skills contain all setup information; users do not need the private companion repository.

Scoped macOS/Codex real-data acceptance and cross-platform automated checks exist. General stable rollout for all clients/OS combinations is not established. Native Windows/Linux authenticated client onboarding, real-data Claude acceptance and comprehensive UI parity remain unverified. The public release is therefore an alpha, with experimental combinations identified explicitly rather than advertised as fully accepted.

## Publication checks

Review outgoing attribution without overriding runtime identity, tracked files and reachable history for credentials/private content, dependency audit, full package checks and clean-source preparation. Verify anonymous retrieval and clean preparation again after visibility changes. Enable and verify private GitHub vulnerability reporting. Keep the internal documentation repository private.

The owner sends any team announcement. Supply a general-rollout announcement only when its compatibility claim is supported; do not infer readiness from public visibility. See RELEASE_CHECKLIST.md and PILOT.md.
