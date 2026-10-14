# Source installation and connection

Public source alpha 0.1.0-alpha.3. Read VERIFICATION.md and SUPPORTED_VERSION.json first. Requires Git, Node.js 24.14+ within Node 24, and a working OS credential store. No npm package exists. The merged default branch supports source installation with browser or Terminal setup. Public repository access needs no GitHub invitation; relay access still requires each user's own identity.

## Assistant-led preparation

A user can give their assistant just this repo link and ask for setup. The assistant must:

1. Read README.md, AGENTS.md, SECURITY.md, this guide and VERIFICATION.md. Clone the repository default branch into an isolated local installation checkout, or reuse an existing clean installation. Preserve development worktrees. Read SUPPORTED_VERSION.json to select the supported source version; do not make users supply commit hashes. Record the resolved default-branch commit and use that checkout throughout preparation; do not guess a feature branch.
2. Prepare Node 24.14+ within Node 24, using an isolated runtime if necessary. From the clean checkout run `npm run prepare-local`. This installs locked dependencies with lifecycle scripts disabled, runs the full checks/build and records version, commit, runtime and platform in ignored `.installation.json`. It does not provision credentials or register clients. The assistant handles these commands.
3. Offer **browser setup (default)** or **Terminal setup**. Ask for the intended relay and public identity if not known; neither is secret. Never read/export Buzz internal credentials.

## Browser setup: no user Terminal input

The assistant runs the following from the built installation, optionally supplying known public `--relay` and `--pubkey` values:

```sh
node dist/cli.js configure --profile personal --method browser
```

The connector opens a short-lived page in the user's default browser. If automatic opening is unavailable, the assistant provides the localhost setup link to the user. Do not open it through assistant browser automation when real credentials will be entered; the user operates their own browser. Do not share the session link with others. The user checks the relay/public identity, enters their own key or encrypted backup and optional password, and explicitly consents to storage. Secrets go from the local page to the local connector and OS store, never through the assistant chat. The form clears secret fields on submission. A completed attempt, failure, cancellation or five-minute timeout closes the listener; retry with a new session. Browser navigation away does not immediately cancel the session; it expires, or the assistant can stop the setup process.

Supported encrypted backups use NIP-49 v2/logN 14–16. Higher costs are refused before expensive decryption. OS storage failure has no plaintext fallback. A profile is never overwritten automatically. Treat a lost connection after submission as uncertain: check `status` and `doctor` before retrying. Setup completion itself verifies relay discovery, identity and one authenticated query, not full compatibility.

## Optional hidden Terminal setup

For users who prefer Terminal, prepare this command for their own terminal:

```sh
node dist/cli.js configure --profile personal --method terminal --relay https://YOUR-BUZZ-RELAY --pubkey YOUR_64_CHARACTER_PUBLIC_KEY
```

Review the warning, type LOCAL-READ, and enter the key or backup only at the hidden prompt. Pipes, command arguments, plaintext key environment variables and assistant chat are not secret-input methods. The assistant must not automate secret entry.

## Diagnose and register

After the user completes their chosen setup, the assistant runs:

```sh
node dist/cli.js doctor --profile personal
```

Linux needs an unlocked desktop Secret Service. Headless Linux/WSL without one fails closed. Windows and WSL have distinct paths and stores. Browser opening also needs a desktop browser; use the explicitly chosen Terminal option when that is unavailable.

## Register with Codex

```sh
codex mcp add buzz-context -- node /ABSOLUTE/PATH/buzz-context-mcp/dist/cli.js serve --profile personal
```

Inspect existing registrations before adding one. Reuse an existing Buzz Context registration only after comparing its executable, path and profile; otherwise choose a distinct name. Use a permanent absolute Node executable if PATH is unreliable. Verify codex mcp list or /mcp. Preserve unrelated client configuration.

## Register with Claude Code

```sh
claude mcp add --scope user --transport stdio buzz-context -- node /ABSOLUTE/PATH/buzz-context-mcp/dist/cli.js serve --profile personal
```

Use project scope if you prefer project-only registration. Quote Windows paths with spaces according to your shell. Verify /mcp. This direct Node launcher does not need npx.cmd wrapping.

Use a client/model account authorized to process the intended workspace content. Existing maintainer Claude test evidence covers synthetic content only; it does not authorize anyone else's account or real-data access.

## Disconnect and troubleshooting

```sh
node dist/cli.js disconnect --profile personal
```

The profile is disabled before key deletion. Readers check profiles before/after calls and poll every two seconds. A failed key deletion leaves a disabled profile so cleanup can be retried after unlocking the store. Only connector-owned state is removed. Remove client registration separately and restart clients to end all processes. A key copied elsewhere and existing provider transcripts are not revoked.

status reports public config only; doctor performs discovery and one authenticated query. Neither proves full coverage. --help lists commands. CONFIG_BUSY means another setup owns the lock; after an interrupted setup, confirm none is running before removing only the connector provisioning.lock.

## Updating an existing installation

Preserve the registered executable path, profile, OS credential entry and unrelated client configuration. Check the installation checkout is clean, record its current commit and preparation metadata, then fast-forward to the reviewed default-branch source and run `npm run prepare-local` with the supported Node runtime. Do not rerun credential provisioning for this document-reader update. Existing MCP processes retain their old tool schema/code: reconnect the Buzz Context MCP or restart the client after preparation. Verify a new STDIO connection reports the updated version and attachment section parameters. For rollback, restore the recorded previous source, prepare it and reconnect. Never pull over a dirty checkout.

## Install the companion skills and verify

Read the public [skills README](https://github.com/moonishaider/buzz-context-skills) and install its three reviewed skill folders into this client's supported local skill location. Preserve existing skills and registrations; the skills require no credentials or additional MCP registration. Codex and Claude Code use different user-skill directories. Other clients require their own verified skill support.

After reconnecting the MCP, inspect connection_status, confirm the intended relay/identity, retrieve a user-selected accessible channel message, and read a supported uploaded document if one is available. Follow every document continuation and report any extraction limits. Confirm all three skill names in the actual client; a file copy alone is not discovery evidence. Do not send test messages or change memberships. Report unavailable checks instead of declaring the installation fully verified.

## Platform preflight for the teammate alpha

The alpha may be installed on the targeted desktop platforms; native Windows/Linux authenticated model workflows remain experimental. Assistants should report the actual local result rather than refusing solely because a human platform pilot has not yet been recorded.

| Platform | Required setup checks |
| --- | --- |
| macOS | Node 24.14+ within Node 24; unlocked Keychain; permanent absolute Node/CLI paths; preparation, doctor and fresh MCP calls |
| Native Windows | Use native Windows Node 24 and paths for the installed client. Quote paths with spaces; the executable may be `node.exe`. Use the Windows credential store. Keep WSL installs separate. Run preparation, doctor and fresh MCP calls on that machine. |
| Linux desktop | Node 24.14+ within Node 24 and an unlocked Secret Service in the user's desktop D-Bus session. Run preparation, doctor and fresh MCP calls. An assistant can diagnose missing desktop keyring components for the actual distribution. |
| WSL/headless | Do not assume the host Windows/macOS credential store is available. Without a working supported Secret Service, setup is unsupported and must stop; never substitute plaintext credential storage. |

Do not change identity, permissions, storage policy or unrelated client settings to get a passing check. If setup fails, preserve the previous working installation and report the failing step with secrets redacted. A successful install verifies that local environment, not all platforms. Other assistants must support local STDIO MCP and their own skill installation; only local Codex/Claude Code have current client evidence.

## Reading complete documents

When a whole transcript is requested, a useful user instruction is: “Read every returned section before summarizing; say if anything remains unread.” The installed skill guides continuation, but a model can still stop early or paraphrase incorrectly. Follow source links for consequential claims. Changing to a larger model alone is not proof of complete reading or summary accuracy.
