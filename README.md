# Buzz Context MCP

An independent, read-only MCP server for retrieving Buzz context in Codex and Claude Code.

**Private alpha; not a public stable release.** Implementation and synthetic tests exist. Live human-identity/UI parity and every OS/client combination still need verification. Read [verification status](docs/VERIFICATION.md) before installing or recommending it.

The server exposes 13 tools for channel/DM discovery, history, search, immutable event text chunks, bounded thread scans, documents/projects, notes, profiles and parent-verified attachments. There are no sends, edits, membership changes, workflow triggers, arbitrary HTTP, shell or generic signing tools.

Each user explicitly provisions their own identity locally. The key carries broader authority than these read tools and is not an independently revocable read-only credential. Never paste it into a coding-assistant conversation. Read [SECURITY.md](SECURITY.md).

Requires Node.js 24.14+ within the Node 24 release line. No package has been published.

- [Install and connect](docs/SETUP.md)
- [Tools and limits](docs/TOOLS.md)
- [Scope](docs/SCOPE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implementation details](docs/IMPLEMENTATION.md)
- [Testing](docs/TESTING.md)
- [Verification](docs/VERIFICATION.md)
- [Roadmap](docs/ROADMAP.md)
- [Sources](docs/SOURCES.md)
- [Coding-assistant instructions](AGENTS.md)

The [companion documentation repository](https://github.com/moonishaider/buzz-context-mcp-docs) contains implementation and operating records. Both repositories stay private during testing.

Apache-2.0 licensed; independent of Buzz, OpenAI and Anthropic. No official endorsement is implied.
