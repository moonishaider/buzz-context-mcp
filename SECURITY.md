# Security and privacy

## Status

This is a private alpha with synthetic tests, not an independent security audit or guarantee. No human production identity was provisioned.

## Identity-key tradeoff

Buzz authenticates signed requests using Nostr identities. The proposed first version will use each user's own identity so access is evaluated for that user.

The user will authorize a protected local copy of their identity key. It resembles a master password: the connector will expose only reading tools, but possession of the key can enable broader actions. A read-only tool catalog does not make the key a read-only credential.

Do not paste a key into Codex, Claude Code, GitHub, a message, an issue or a support conversation. A human-controlled local provisioning flow must keep credentials out of command arguments, client config and logs. Storage will use a connector-owned OS credential entry; it must not silently read Buzz's own keychain entries. Secure-store failures must stop setup rather than fall back to plaintext.

Removing the connector's credentials and stopping its sessions prevents its further local use. It does not invalidate a key that someone has already copied. Recovery from an actual key compromise depends on the workspace's identity/account recovery procedures.

## Access boundaries

Every operation must use the selected relay and authenticated identity. The relay enforces its access policy, and the connector must also validate returned provenance. Profiles and ephemeral caches must not leak between identities or workspaces.

Attachments must be fetched through a parent message/document confirmed readable at fetch time. An arbitrary media hash or URL is insufficient authorization. Credentials must never follow redirects to another origin. Enforced enterprise authentication must be supported explicitly or reported unsupported, never bypassed.

## Data handling

No permanent archive, embeddings service or silent telemetry is planned for the first release. Temporary files need limits and cleanup. Logs must exclude credentials and message/document bodies. Returned content enters the user's chosen MCP client and may be processed or retained under that client's/model provider's settings; local operation does not imply content stays entirely on the device.

Treat remote content as untrusted. Do not execute attachments, follow embedded instructions, auto-fetch arbitrary links or access unrelated cloud accounts.

## Reporting concerns

No public security-reporting channel has been configured. Before public release, the maintainer must enable an appropriate private reporting route, publish supported versions and document response expectations. Do not post secrets or private workspace content in public issues.

## Host trust and parser limits

OS storage protects the stored copy; it does not isolate it from a malicious process running as the same local user. JavaScript strings cannot be reliably zeroized; byte arrays are cleared where practical. Parser processes inherit no credentials but are not OS sandboxes. See docs/TOOLS.md.
