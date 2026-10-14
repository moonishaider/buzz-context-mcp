# Roadmap and decisions

## Current state

The read-only implementation, browser/Terminal setup, skills guidance and document correction are merged. The maintainer authorized public-source alpha distribution of the connector and skills on October 15, 2026 (local date); the internal documentation repository stays private. Version 0.1.0-alpha.3 is installed from source. No npm package is published.

## Next acceptance work

Fresh teammate installation, actual skill discovery and authenticated message/document reads on the intended clients and platforms. macOS/Codex has scoped real-data acceptance; macOS/Claude and native Windows/Linux client workflows remain experimental as described in VERIFICATION.md. General stable rollout awaits evidence rather than a date or percentage estimate.

## Product boundaries

Read-only retrieval, per-user permissions, local human-controlled provisioning, on-demand history/search and bounded attachments. No background complete archive or automatic cloud-account access. Keep unsupported encryption, edits/deletions, legacy threads and extraction limits explicit.

Future options include signer-based/scoped authorization, enterprise adapters, hosted connections, optional local indexing and separately authorized write features. These are not current functionality.

Apache-2.0 licensed, independent of Buzz/OpenAI/Anthropic. Public source permission does not authorize extracting credentials, publishing workspace content, contacting teammates or publishing an npm package.

## Teammate alpha rollout decision — October 15, 2026 (local date)

The maintainer explicitly approved a teammate-first alpha rollout with public source availability and Windows/Linux feedback collected after release. These unverified combinations are not installation blockers for the alpha; they remain experimental and each installer must run the documented local checks. This supersedes the earlier requirement to withhold an announcement until every platform/client had full human acceptance. It does not change any recorded test result or claim stable universal support.

Release scope: existing read-only connector 0.1.0-alpha.3 plus instruction-only skills 0.1.1, local Codex or Claude Code, each person's own locally provisioned identity. No npm publication, automatic remote updates, account changes, teammate outreach or connector runtime changes are part of this release. The owner sends the announcement.
