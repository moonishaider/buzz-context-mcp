# Release review packet

The private alpha's main integration defect is fixed. Public distribution remains blocked by human/client acceptance; this is a concrete preparation record, not a publication request or a production-readiness claim.

## Reviewed behavior and evidence

Code baseline: **79dca42197b085bd13e22551b9860261bf5f6dbe**. Native DM discovery uses the pinned Buzz relay's group metadata and rechecks membership. Diagnostics disclose unsupported encrypted-DM and current-UI/legacy-thread paths. The first release remains strictly read-only.

- Full local package check: 20 tests passed, including native OS credential storage/removal.
- [Complete CI run](https://github.com/moonishaider/buzz-context-mcp/actions/runs/38564390325): all five jobs passed, including the stronger official-relay DM/image/private-access/revocation suite and macOS/Windows/Linux package jobs.
- macOS real-client model/tool checks: Codex 0.162.0 and Claude Code 2.1.132 passed permitted/denied reads, attachment extraction and native DM discovery against a synthetic fixture. No production identities/content were used.
- Dependency audit: zero advisories at the audit time.
- Private tarball was installed into a fresh disposable folder with lifecycle scripts disabled; the packaged CLI help succeeded under Node 24.14. Package files excluded tests, CI and scratch content. Repack and inspect the exact final documentation candidate before publication.

## Outstanding acceptance

1. Human credential provisioning and a successful read-only Buzz/UI pilot; use PILOT.md.
2. Authenticated Codex and Claude real-client workflows on native Windows and Linux, including installation, storage and disconnect. No such machines/client logins were made available in this run. Package CI does not fill these four model/client cells.
3. Maintainer acceptance of the documented unsupported encryption/edit/delete/legacy-thread behavior, or a separately scoped implementation to close those gaps. Do not silently advertise full UI parity or all encrypted DMs.
4. Final exact commit/artifact review, supported-environment declaration and private vulnerability reporting setup.

The original all-six-client/OS acceptance target is still incomplete. A narrower experimental release would be an explicit product-scope decision, not a substitute for those tests.

## Proposed distribution for final approval

- Implementation and documentation repositories under the maintainer's personal GitHub account.
- Existing Apache-2.0 license; final approval includes that license.
- Proposed version/tag: **0.1.0-alpha.1 / v0.1.0-alpha.1**, labelled alpha with precise support limits.
- Proposed npm name: **buzz-context-mcp**. An October 14 registry lookup returned 404; this does not reserve the name or prove publishing rights. Verify availability, publisher authentication and package ownership before selecting npm as an approved destination. GitHub release/source distribution is an alternative requiring its own exact approval.
- Keep `private: true` until explicit publication authorization. No merge, tag, visibility change, npm login or publication has occurred.
- Enable and verify a private GitHub vulnerability-reporting route as part of the approved public-release setup; do not invent a contact address or claim that route is already available.

Final approval must identify the exact two PR heads, release artifact/version, public repository targets, distribution destination and compatibility claims. After approval, verify fresh installation from the actual published artifact before providing installation links for teammates.

## Announcement preparation

A team announcement may describe the independent read-only alpha, per-user local credential provisioning, supported environments and limitations. It must link to verified public installation instructions and the actual released artifact. Keep the announcement as a draft until publication and post-publication installation succeed. The owner sends it; no team outreach is authorized here.

## Browser onboarding candidate

0.1.0-alpha.2 adds optional hidden Terminal setup alongside a default local browser form, shared storage/authentication checks, partial-write cleanup and supported source-version metadata/preparation. It is intended to remove human-supplied commit hashes after default-branch merge. Review the browser request boundaries in SECURITY.md and evidence limits in VERIFICATION.md. Existing private PR #1 contains the complete read-only reader plus this onboarding update; merging it affects the entire candidate, not only the form. Merge approval and public publication are separate; no public release is requested by this implementation alone. Human production/UI acceptance and native Windows/Linux client workflows remain outstanding.
