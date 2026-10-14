# First-user pilot and rollback

This is the human acceptance procedure for the public source alpha. Public availability does not establish a general stable rollout. Start with a reviewed commit whose complete package and disposable-relay checks pass.

## Prepare the candidate

Use a separate clean installation checkout of the public implementation repository's merged default branch. The assistant follows SUPPORTED_VERSION.json and runs `npm run prepare-local`, which records the exact commit automatically; users do not need to supply a hash. Use a permanent Node 24.14+ executable within the Node 24 line, not a disposable test runtime.

```sh
node --version
npm ci --ignore-scripts
npm run check
```

Read SECURITY.md and TOOLS.md before provisioning. Current native Buzz channel DMs are supported by the reader design; standard NIP-04/NIP-17 encrypted DMs, current-UI edit/delete reconciliation and legacy unmarked thread reconstruction are unsupported. The pilot must record those limits rather than count them as passes.

## Human-controlled credentials

Choose browser setup (default) or hidden Terminal setup in SETUP.md. For browser setup the assistant launches the local form, and the human uses their own browser to check the relay/public identity, enter credentials and approve storage. For Terminal setup the human enters them at the hidden prompt in their own terminal. Never paste secrets in chat or use an assistant-controlled browser/terminal for real secret entry. The connector creates its own OS entry and does not read Buzz's internal credential storage.

Run the doctor command for the pilot profile. It verifies an authenticated request, not complete product coverage. Retain the result locally without publishing identity or workspace details.

## Client registration

Use a client/model account authorized by the participating human to process the intended workspace content. Historical maintainer Claude evidence is synthetic only. It does not establish real-data acceptance or authorize use of another company account.

Use the exact client registration command in SETUP.md only after reviewing its scope. Add a distinct registration name/profile so existing integrations are preserved. Record the registration and permanent Node path for rollback. No global client config changes are part of automated synthetic testing.

## Compare representative reads

Record each check as PASS, FAIL or UNSUPPORTED with candidate/client/relay versions and date. Keep real IDs, screenshots and content local; committed verification should contain only redacted summaries.

| Check | Evidence needed |
| --- | --- |
| Identity and diagnostics | Intended public identity/relay and explicit unsupported-feature notices |
| Channels and native DMs | Representative visible conversations match Buzz; hidden-sidebar parity is assessed separately |
| History and pagination | Representative text, authors, times and successive pages match the supported signed-event view |
| Search | Expected message hits and actual coverage limitations; no claim that files are indexed |
| Threads | Direct/nested explicit-marker replies match the supported thread subset |
| Files | Authorized PDF/DOCX/text/table/image extraction; truncation, unsupported formats and external-link handling are explicit |
| Edits/deletions/encryption | Unsupported paths disclosed; no false current-UI or encrypted-DM coverage claim |
| Permissions | Disposable-relay cross-user and revocation evidence passes; no real-user membership mutation for testing |

The pilot is read-only. Do not create real test messages, alter channel memberships or contact teammates. If a supported read contradicts the UI, stop acceptance for that path and diagnose before releasing.

## Disconnect

Close test sessions and run `node dist/cli.js disconnect --profile PILOT_PROFILE` locally only when you intend to remove that connector profile. Verify the profile is disabled and its connector-owned OS entry is removed. Remove the specific client registration you added and restart that client. Do not remove unrelated registrations or Buzz's own credentials. Disconnect does not erase provider transcripts or revoke a copied identity key.

## Release gate

A successful pilot is one part of acceptance. Complete the support matrix, artifact review and RELEASE_CHECKLIST.md. Connector and skills public-source visibility is authorized; the internal documentation stays private. npm publication and new distribution targets require their own authorization. Keep unverified environments experimental.
