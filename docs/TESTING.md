# Testing and release requirements

Begin with disposable identities and synthetic content on an isolated relay. Do not create production channels, send production test messages or alter real users' membership for tests.

## Required permission tests

Use two identities with different private channels and DMs. Verify private isolation across discovery, search, direct message IDs, thread traversal, global queries and attachments. Test membership removal, profile changes, cache separation and inaccessible parent references. Public/open-channel results must follow the configured relay's policy.

Verify malformed signatures, changed request bodies, stale/replayed authentication, wrong origins, redirects, unexpected authentication requirements and secure-store failure. Ensure credentials never appear in results, logs, arguments or serialized config. Reject arbitrary signing and writes regardless of tool annotations.

## Required functional tests

History and thread pagination must handle equal timestamps without missing/duplicating content. Search must report its actual coverage. Test edits, deleted content, inaccessible/missing parents, timeouts, limits, unsupported formats and bounded extraction. If encrypted DM handling is unavailable, return an explicit unsupported result.

## Compatibility matrix

| Environment | Codex model/tool fixture | Claude Code model/tool fixture |
| --- | --- | --- |
| macOS | Allowed/denied reads, file extraction and native DMs passed on 0.162.0 at code commit 79dca42197b085bd13e22551b9860261bf5f6dbe | Same synthetic reads passed on 2.1.132/Sonnet 4.6 after human login refresh, using code built from that commit |
| Native Windows | Not tested | Not tested |
| Linux | Not tested | Not tested |

Run the full package suite, types, lint and build on each supported OS. Exercise real installation, storage, MCP calls and disconnect with both clients on each OS. CI compilation alone is insufficient. Keep unsupported or unverified combinations experimental.

All three OS package checks, native secure-store checks and the stronger official-relay synthetic suite passed at that code commit; see VERIFICATION.md for the exact run. The matrix above reports authenticated model/tool evidence, not complete installation/provisioning/UI pilot acceptance. No client/OS combination has completed that full human workflow yet. Standard encrypted DMs and current-UI edit/delete/legacy-thread reconciliation remain unsupported.

Company-account Claude authorization is limited to synthetic tests. Run those from a neutral temporary directory, with isolated MCP settings, plugins/hooks and built-in filesystem/shell tools disabled, and no real project context or inherited Buzz authentication environment. Do not send real Never Absolute content to the company client. A local login and a successful MCP handshake do not prove model access; inspect actual tool results and error/cost metadata.

After disposable-identity checks pass, the maintainer can be the first real user through explicit local provisioning. Compare representative channel/DM history and files with their Buzz UI. Additional pilots need the participating person's consent. Record exact release/client/relay versions and evidence without committing real content.

Stable publication requires passing permission tests, named platform/client evidence, reviewed dependencies/artifacts, complete documentation and explicit release authorization.

Current implementation limits and evidence are authoritative in TOOLS.md and VERIFICATION.md. Earlier planned targets are not verified compatibility claims.
