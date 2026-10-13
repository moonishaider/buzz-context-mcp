# Primary sources

Sources used for the initial design. Upstream behavior can change; verify supported releases during implementation.

- [Buzz source repository](https://github.com/block/buzz)
- [Buzz Nostr authentication service](https://github.com/block/buzz/blob/main/crates/buzz-auth/src/lib.rs): identity binding and ordinary authentication scopes.
- [Buzz desktop identity operations](https://github.com/block/buzz/blob/main/desktop/src-tauri/src/commands/identity.rs): identity export and encrypted-backup operations; no external signing API is established by this alone.
- [HTTP bridge snapshot](https://github.com/block/buzz/blob/85b7331784804fbf9bb07df4199d4dc6a2b42ade/crates/buzz-relay/src/api/bridge.rs): authenticated queries and channel/search visibility.
- [Media snapshot](https://github.com/block/buzz/blob/85b7331784804fbf9bb07df4199d4dc6a2b42ade/crates/buzz-relay/src/api/media.rs): relay-member media reads; connector attachment provenance is an additional requirement.
- [NIP-OA](https://github.com/block/buzz/blob/main/docs/nips/NIP-OA.md): owner attestation and its non-impersonation boundary.
- [NIP-FI snapshot](https://github.com/block/buzz/blob/85b7331784804fbf9bb07df4199d4dc6a2b42ade/docs/nips/NIP-FI.md): additional federated authentication requirements.
- [Official OpenAI MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli): local MCP configuration.
- [Claude Code MCP documentation](https://code.claude.com/docs/en/mcp): MCP connections and configuration.
- [Official MCP SDK transport documentation](https://ts.sdk.modelcontextprotocol.io/v2/clients/connect): local STDIO and HTTP transports.

No source establishes that this proposed connector is implemented, audited or compatible with every deployed Buzz workspace.
