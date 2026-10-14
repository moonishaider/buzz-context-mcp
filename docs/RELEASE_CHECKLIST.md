# Release checklist

- [ ] Exact reviewed commit and attribution verified.
- [x] Full package CI and secure-store behavior passed on macOS/Windows/Linux at code commit 79dca42197b085bd13e22551b9860261bf5f6dbe; recheck the final release candidate.
- [x] Disposable official Buzz relay tests prove the tested cross-user isolation, native DM discovery and uploaded-image paths at that code commit.
- [ ] First-human pilot matches representative UI history, DMs and attachments.
- [ ] Real Codex/Claude workflows verified for every stable environment.
- [ ] Encryption, edited/deleted history and legacy-thread limits accepted or resolved.
- [ ] Dependencies/artifacts checked; no keys or private content included.
- [ ] Private vulnerability-reporting route and supported versions documented.
- [ ] Human explicitly authorizes repository visibility and package publication.
- [ ] Only then remove private=true and publish the reviewed release.

Synthetic passes, HTTP 200 and a model summary do not replace named live evidence.
