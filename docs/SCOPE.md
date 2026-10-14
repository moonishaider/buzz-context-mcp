# First-release scope

| Area | Implemented coverage (subject to documented limits) |
| --- | --- |
| Connection | Relay/profile status, public identity and capability diagnostics |
| Discovery | Visible channels, accessible DMs, channel metadata, user profiles |
| Conversations | Search, channel history, readable messages, paginated threads and forums |
| Knowledge | Authorized canvases, canvas history and notes |
| Projects | Visible projects, issues/tasks, repository metadata and patches where access can be established |
| Attachments | Authorized parent references, bounded download and extraction |

Results must carry identifiers, dates, source references and explicit pagination/truncation information. Permission uncertainty results in denial or an unsupported response, never an unfiltered fallback. Public/open content follows the relay's actual access policy; accessible content is not necessarily limited to joined channels.

Supported extraction includes plain text, text PDFs, DOCX, bounded CSV/XLSX tables and supported images. Unsupported formats return metadata with a reason. Encryption/decryption paths must be verified independently before claiming complete DM coverage.

Deferred: message sending and edits; membership changes; workflow triggers; private agent memory and relay-backed skills; complete repository source retrieval; OCR; audio/video transcription; external-account integration; background archives; hosted services; independently revocable scoped authorization and enterprise adapters not supported in v1.

An external link is a source reference, not permission to access another account. File extraction is distinct from full-text search inside all attachments: v1 does not promise a searchable index of every file.

Current implementation limits and evidence are authoritative in TOOLS.md and VERIFICATION.md. Earlier planned targets are not verified compatibility claims.
