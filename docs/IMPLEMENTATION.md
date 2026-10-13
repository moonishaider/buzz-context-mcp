# Implementation map

| Source | Responsibility |
| --- | --- |
| cli.ts | Human provisioning, launcher, status/doctor and disconnect |
| config.ts | Public profiles, exclusive setup lock, atomic updates and disabled state |
| credentials.ts | Connector-owned OS entries; no plaintext fallback |
| secret-input.ts | Raw/nsec and bounded encrypted-backup decoding |
| protocol.ts | Fixed read kinds, signed authentication and event signature/scope verification |
| client.ts | Same-origin requests, no redirects, stream limits and hashes |
| budget.ts | Per-operation deadline/request budget |
| reader.ts | Access checks, retrieval, cursors, source provenance and parent checks |
| server.ts | MCP tools, concurrency and output limits |
| extract.ts / extract-worker.ts | Killable, bounded parser-process lifecycle and extraction |

Files reside in src/. Profile keys are identified by profile, relay and public identity under OS service buzz-context-mcp.v1. Linux explicitly requires Secret Service. Credentials are absent from profile JSON, MCP arguments/results and configuration commands.

Provisioning checks identity and performs discovery/authentication before storing. Disconnect disables the public profile first, then deletes its credential; failure leaves a retryable disabled profile. Readers stop when their profile disappears or changes.

Global message searches recheck each returned channel; no persistent ACL/content cache exists. Attachments require a parent before/after download and hash verification. Additional advertised enterprise authentication is refused.

The synthetic test relay verifies client behavior; it is not production Buzz and cannot establish identical deployed permission semantics. Fixtures are excluded from package files. private=true prevents accidental npm publication. Dependencies and Actions are pinned; installation skips lifecycle scripts.
