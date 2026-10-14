# Buzz Context MCP

An independent, read-only connector that lets a local coding assistant search and read the Buzz conversations and supported uploads your account can access.

**Public source alpha, version 0.1.0-alpha.3.** Scoped real-data use is verified on macOS with Codex. Both local Codex and Claude Code passed current synthetic retrieval and three-skill discovery/use checks on macOS; Claude real-data acceptance and summary-quality acceptance remain unverified. Windows/Linux have automated package and credential-store checks, but authenticated client setup remains experimental. This is not a general stable release. See [verification and support](docs/VERIFICATION.md).

## Set up the connector and skills

Paste this into your local Codex or Claude Code session:

> Set up https://github.com/moonishaider/buzz-context-mcp and install all three skills from https://github.com/moonishaider/buzz-context-skills. Follow both READMEs, preserve my existing settings, offer browser or Terminal setup, and verify the connection and skill discovery. Keep my credentials out of chat and tell me about any unverified support on my platform.

Your assistant prepares the source installation, helps connect your own Buzz identity through a local browser form or hidden Terminal prompt, registers the MCP, and installs the three research skills. You enter credentials locally yourself; never paste them into assistant chat. Each person uses their own identity and permissions. Public source does not grant access to anyone else's Buzz workspace.

Requires Git, Node.js 24.14+ within Node 24, a working OS credential store, a compatible Buzz relay, and a local client supporting STDIO MCP. Linux requires an unlocked desktop Secret Service. No npm package is published; do not use an invented `npx` installer. Other MCP clients may work but have not been accepted. The skills require the client's own local skill support.

The default branch contains the merged implementation. [SUPPORTED_VERSION.json](SUPPORTED_VERSION.json) records the supported source version; `npm run prepare-local` verifies a clean checkout and records its exact commit. No manual commit hash or private GitHub access is needed to read these public source repositories.

## What it reads

13 tools cover channel/native-DM discovery, history, message search, event text, explicit threads, documents/projects, notes, profiles and parent-authorized attachments. Supported document extraction includes text, text PDFs, DOCX and bounded CSV/XLSX, with continuation for long text. There are no messaging, editing, membership or workflow-write tools.

Retrieval is on demand. Standard encrypted Nostr DMs, current-UI edit/delete reconciliation, legacy unmarked thread reconstruction, OCR, old DOC, audio/video transcription, external-account access and attachment-body search indexing are unsupported. See [tools and limits](docs/TOOLS.md).

## Privacy and help

The tool surface is read-only, but the stored identity key carries broader authority. It is stored in a connector-owned OS credential entry and is not an independently revocable read-only token. Retrieved content enters your chosen client/model provider. Read [SECURITY.md](SECURITY.md) before connecting.

- [Setup, updates and disconnect](docs/SETUP.md)
- [Verification and support](docs/VERIFICATION.md)
- [Tools and limits](docs/TOOLS.md)
- [Architecture](docs/ARCHITECTURE.md) and [implementation](docs/IMPLEMENTATION.md)
- [Acceptance procedure](docs/PILOT.md), [testing](docs/TESTING.md), [release review](docs/RELEASE_REVIEW.md)
- [Sources](docs/SOURCES.md) and [contributor instructions](AGENTS.md)
- [Optional research skills](https://github.com/moonishaider/buzz-context-skills)

All installation and support information needed by users is in this repository. The maintainer's companion documentation repository remains private and is not required for setup. Apache-2.0 licensed; independent of Buzz, OpenAI and Anthropic, with no official endorsement.
