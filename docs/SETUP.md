# Source installation and connection

Private alpha. Read VERIFICATION.md first. Requires access to the private repository, Node.js 24.14+ within Node 24, and a working OS credential store. Pin the reviewed commit; no public package exists.

1. Clone https://github.com/moonishaider/buzz-context-mcp and check out the reviewed implementation commit.
2. Build and test in that checkout:
```sh
npm ci --ignore-scripts
npm run check
```
3. Run human-controlled provisioning in your own local terminal:
```sh
node dist/cli.js configure --profile personal --relay https://YOUR-BUZZ-RELAY --pubkey YOUR_64_CHARACTER_PUBLIC_KEY
```
Review the warning and type LOCAL-READ. Supply your own nsec/hex key or supported encrypted backup only at the hidden local prompt. Never place the secret in this command, config, chat or an assistant-visible terminal transcript. Encrypted backups support NIP-49 v2/logN 14–16; higher costs are refused before expensive decryption. No automatic extraction from Buzz storage occurs.

4. Check the authenticated connection:
```sh
node dist/cli.js doctor --profile personal
```

Linux needs an unlocked desktop Secret Service. Headless Linux/WSL without one fails closed. Windows and WSL use distinct paths and credential stores. Do not use a plaintext environment-variable key.

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

## Assistant-assisted setup

Ask your assistant to read README.md, AGENTS.md, SECURITY.md and this guide. It can install/build/register approved source; the human completes provisioning in their own terminal. The assistant must not collect a key, copy Buzz keychain entries or automate secret prompts. A company client account needs authorization when used to test a personal project.

## Disconnect and troubleshooting

```sh
node dist/cli.js disconnect --profile personal
```

The profile is disabled before key deletion. Readers check profiles before/after calls and poll every two seconds. A failed key deletion leaves a disabled profile so cleanup can be retried after unlocking the store. Only connector-owned state is removed. Remove client registration separately and restart clients to end all processes. A key copied elsewhere and existing provider transcripts are not revoked.

status reports public config only; doctor performs discovery and one authenticated query. Neither proves full coverage. --help lists commands. CONFIG_BUSY means another setup owns the lock; after an interrupted setup, confirm none is running before removing only the connector provisioning.lock.
