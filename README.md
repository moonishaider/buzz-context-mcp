# Buzz Context MCP

An independent, read-only MCP server for retrieving Buzz context in Codex and Claude Code.

**Private alpha; not a public stable release.** Implementation and synthetic tests exist. Live human-identity/UI parity and every OS/client combination still need verification. Read [verification status](docs/VERIFICATION.md) before installing or recommending it.

The server exposes 13 tools for channel/DM discovery, history, search, immutable event text chunks, bounded thread scans, documents/projects, notes, profiles and parent-verified attachments. There are no sends, edits, membership changes, workflow triggers, arbitrary HTTP, shell or generic signing tools.

Each user chooses a local browser form (default) or hidden Terminal prompt to provision their own identity. Their assistant can prepare the installation and launch the browser form; no terminal commands or terminal secret entry are needed from the user in browser mode. The key carries broader authority than these read tools and is not an independently revocable read-only credential. Never paste it into a coding-assistant conversation. Read [SECURITY.md](SECURITY.md).

Requires Node.js 24.14+ within the Node 24 release line. No package has been published. The supported source version is recorded in [SUPPORTED_VERSION.json](SUPPORTED_VERSION.json).

## Ask your assistant to set it up

> Set up https://github.com/moonishaider/buzz-context-mcp so you can search and read the Never Absolute conversations my Buzz account can access. Follow the repository setup instructions and offer browser or Terminal setup.

The assistant reads this repository and prepares the supported default-branch source using `npm run prepare-local`. It records the exact version automatically; you do not need to specify a commit. You still need private-repository access and your own Buzz credentials. Browser setup keeps those credentials out of the assistant conversation. This prompt becomes the supported entrypoint after this candidate is merged to the default branch; until then the default branch remains initialization-only. Retrieval is on demand and subject to the documented limits, rather than an automatic complete history import.

- [Install and connect](docs/SETUP.md)
- [Tools and limits](docs/TOOLS.md)
- [Scope](docs/SCOPE.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Implementation details](docs/IMPLEMENTATION.md)
- [Testing](docs/TESTING.md)
- [Verification](docs/VERIFICATION.md)
- [First-user pilot and rollback](docs/PILOT.md)
- [Release review packet](docs/RELEASE_REVIEW.md)
- [Roadmap](docs/ROADMAP.md)
- [Sources](docs/SOURCES.md)
- [Coding-assistant instructions](AGENTS.md)

The [companion documentation repository](https://github.com/moonishaider/buzz-context-mcp-docs) contains implementation and operating records. Both repositories stay private during testing.

## Optional research skills

The private [Buzz Context Skills](https://github.com/moonishaider/buzz-context-skills) repository provides three instruction-only workflows for research, catch-ups and document review. Follow its README to review and install them into your client's supported skill location. They are used by the assistant, not fetched automatically by this server, and do not add tools or permissions. They require no additional credentials or MCP registration. Ordinary answers should use readable source names, authors and dates; exact source references remain in tool results for verification.

Apache-2.0 licensed; independent of Buzz, OpenAI and Anthropic. No official endorsement is implied.
