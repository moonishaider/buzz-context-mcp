# Tools and limits

The tool catalog is: connection_status, list_channels, list_dms, read_channel_history, get_message, read_event_text, search_messages, read_thread, read_documents, list_notes, list_users, list_attachments and read_attachment.

All tools are read-only. Fixed requests allow /query POST, public discovery GET and parent-verified media GET. They never expose arbitrary HTTP or signing. Per-operation budget: 60 seconds and 100 requests; at most two concurrent reads; individual requests have a 20-second maximum.

Pages contain 1–30 events, default 10. History cursors are bound to operation, relay and identity, with timestamp-tie deduplication. A bucket exceeding the bounded relay window produces PAGINATION_LIMIT instead of skipping content. Search is ranked/live, uses the relay page extension and does not index attachment bodies.

Event previews clip text to 4,000 characters and tags to bounded excerpts. read_event_text supports up to 10,000 UTF-16 code units per chunk with next_offset. Source references use Nostr nevent URIs plus exact IDs and relay. Original event snapshots are not reconciled into the latest edited/deleted UI view.

Threads are bounded explicit-root subsets of channel scans. Legacy unmarked replies may require surrounding history. Empty channel-bound document results do not establish that no unbound documents exist. Encrypted standard DM event handling is not implemented.

Downloads: 10 MiB maximum; inline signature-checked PNG/JPEG/GIF/WebP: 2 MiB maximum; SVG refused. Extracted text: 20,000 characters; PDF: at most 20 pages, no OCR. Office ZIP extraction: selected inflated XML at most 2 MiB/file and 8 MiB total; 500 entries; DTD/entities refused. XLSX: raw stored values, no formula evaluation or formatting, at most 5 sheets/100 rows/30 cells. CSV: bounded raw tabular text.

Parsing runs in killable processes with empty environments, 256 MiB V8 heap budgets and 15-second deadlines. This is process isolation, not an OS network/filesystem sandbox or proof that third-party parsers are vulnerability-free. External attachment links are reference-only.
