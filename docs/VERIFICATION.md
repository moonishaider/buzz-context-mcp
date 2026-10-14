# Verification and support

## Current distribution

Public source alpha **0.1.0-alpha.3**, installed from the merged default branch. The maintainer authorized public visibility for the connector and skills repositories on October 15, 2026 (local date); internal documentation remains private. No npm package is published. Public availability is not a stable compatibility claim.

## Evidence

- Document-reader code commit **86f09429ad3076b254a3426ee770245909289196** passed all 35 local tests, type/lint/build checks with native macOS keyring tests enabled.
- The merged baseline **b6b4b5a0413c6c4dda5188d53b32b8c0b5d893aa** passed [all five CI jobs](https://github.com/moonishaider/buzz-context-mcp/actions/runs/38640483118): macOS/Windows/Linux package checks, Linux Secret Service and pinned official-relay integration. The permission suite covers cross-user denials, native DM discovery, positive/private search, attachment-parent denial and membership revocation using disposable identities and synthetic content.
- Fresh authenticated STDIO connections from the updated macOS source and registered installation read one real uploaded transcript in four sections. All 34,808 characters matched an independently downloaded file, including beginning, middle and end. Normal channel history and source-message reads passed. The user's subsequent Codex response reported complete reading. No real content or private source identifiers are stored in this repository.
- Earlier macOS synthetic model/tool acceptance passed in Codex CLI 0.162.0 and Claude Code 2.1.132/Sonnet 4.6 at code commit **79dca42197b085bd13e22551b9860261bf5f6dbe**. Allowed/denied reads, synthetic attachment extraction and native DM discovery were observed; this does not prove real-data Claude acceptance of the current version.
- Browser provisioning was exercised with a disposable identity through the actual local form and OS keyring, with mocked relay methods. Identity/auth failure, origin/host/capability checks, cancellation/expiry, concurrent use and partial-write cleanup have automated coverage. This is not proof of fresh real-human onboarding on every OS.

## Support matrix

| Environment | Evidence | Status |
| --- | --- | --- |
| macOS ARM64, Node 24.14, Codex | Automated package/keyring, synthetic model/tool and scoped real-data history/transcript acceptance | Usable alpha within documented limits; complete UI-parity and fresh teammate onboarding remain unverified |
| macOS, Claude Code | Synthetic model/tool acceptance; no real-data human pilot | Experimental |
| Native Windows, Codex or Claude Code | Package/credential checks in CI; no authenticated human client installation | Experimental |
| Linux desktop with unlocked Secret Service | Package/secure-store CI; no authenticated human client installation | Experimental |
| Headless Linux/WSL without Secret Service | Secure storage unavailable | Unsupported; no plaintext fallback |
| Other MCP clients | No acceptance evidence | Unverified |

## Remaining acceptance

A general stable rollout across every advertised platform/client is **not established**. Obtain fresh human installation, credential provisioning, skill discovery, permitted message/document reads and disconnect evidence on the intended environments before upgrading their status. Do not replace these checks with CI or a model's assertion. No teammate outreach is part of this release work.

Standard encrypted Nostr DMs, current-UI edits/deletions, legacy unmarked thread reconstruction, OCR, old DOC, transcription, external accounts and file-body indexing remain unsupported. Read TOOLS.md for extraction and pagination bounds. Existing MCP sessions must reconnect after source updates.
