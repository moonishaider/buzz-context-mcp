# Roadmap and decisions

## Current state

Implementation is authorized and a private alpha exists. Public release and the first human pilot remain gated on verification.

## Agreed product direction

Read-only retrieval; user-specific permissions; configurable compatible Buzz workspaces; macOS/Windows/Linux targets; Codex and Claude Code; on-demand search/history rather than a permanent archive; human- and assistant-readable setup.

## Proposed delivery sequence

1. Documentation-only private repository under the maintainer's chosen organization.
2. After implementation approval, secure local provisioning, restricted signed read adapter and safe diagnostics.
3. Discovery, search and conversation retrieval, followed by knowledge/projects and bounded attachments.
4. Complete synthetic permission tests and OS/client workflow checks.
5. First real-user pilot under explicit local authorization.
6. Review release artifacts, private-data/credential exclusions and compatibility claims.
7. Separately authorized public repository/package release.

The proposed name is `buzz-context-mcp`; availability must be checked in the selected organization. Apache-2.0 is the proposed license and needs final selection before publication. No trademark endorsement is implied.

## Future options

Signer-based authorization without a connector-held identity key; independently revocable scoped access where supported; enterprise adapters; hosted URL-based connection; optional local archival search; separately scoped write features.

## Approval boundaries

Repository documentation preparation does not authorize connector implementation. Implementation approval does not authorize real-key extraction, public release or publishing private workspace content. Human-controlled credential provisioning and public release remain distinct steps.

Current implementation limits and evidence are authoritative in TOOLS.md and VERIFICATION.md. Earlier planned targets are not verified compatibility claims.
