# Source installation and connection

Private alpha. Read VERIFICATION.md and SUPPORTED_VERSION.json first. Requires private repository access, Node.js 24.14+ within Node 24, and a working OS credential store. No public package exists. Browser setup is supported by this candidate; the repo-link-only entrypoint is ready to activate when the maintainer merges it to the default branch.

## Assistant-led preparation

A user can give their assistant just this repo link and ask for setup. The assistant must:

1. Read README.md, AGENTS.md, SECURITY.md, this guide and VERIFICATION.md. Clone the repository default branch into an isolated local installation checkout, or reuse an existing clean installation. Preserve development worktrees. Read SUPPORTED_VERSION.json to select the supported source version; do not make users supply commit hashes. If the default branch is initialization-only, stop and report that the candidate needs maintainer merge; do not guess another branch.
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

Use an absolute Node executable if PATH is unreliable. Verify codex mcp list or /mcp. Preserve existing client configuration.

## Register with Claude Code

```sh
claude mcp add --scope user --transport stdio buzz-context -- node /ABSOLUTE/PATH/buzz-context-mcp/dist/cli.js serve --profile personal
```

Use project scope if you prefer project-only registration. Quote Windows paths with spaces according to your shell. Verify /mcp. This direct Node launcher does not need npx.cmd wrapping.

A company client account needs authorization when used to test a personal project. Current Claude authorization covers synthetic content only.

## Disconnect and troubleshooting

```sh
node dist/cli.js disconnect --profile personal
```

The profile is disabled before key deletion. Readers check profiles before/after calls and poll every two seconds. A failed key deletion leaves a disabled profile so cleanup can be retried after unlocking the store. Only connector-owned state is removed. Remove client registration separately and restart clients to end all processes. A key copied elsewhere and existing provider transcripts are not revoked.

status reports public config only; doctor performs discovery and one authenticated query. Neither proves full coverage. --help lists commands. CONFIG_BUSY means another setup owns the lock; after an interrupted setup, confirm none is running before removing only the connector provisioning.lock.

## Updating an existing installation

Preserve the registered executable path, profile, OS credential entry and unrelated client configuration. Check the installation checkout is clean, record its current commit and preparation metadata, then fast-forward to the reviewed default-branch source and run `npm run prepare-local` with the supported Node runtime. Do not rerun credential provisioning for this document-reader update. Existing MCP processes retain their old tool schema/code: reconnect the Buzz Context MCP or restart the client after preparation. Verify a new STDIO connection reports the updated version and attachment section parameters. For rollback, restore the recorded previous source, prepare it and reconnect. Never pull over a dirty checkout.
