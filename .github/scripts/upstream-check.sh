#!/usr/bin/env bash
set -euo pipefail
image='ghcr.io/block/buzz@sha256:848fbf014382f152f126af5c85437cdcbe4f205126ef9a89f5f0133a421a2cfa'
trap 'docker rm -f buzz-context-fixture >/dev/null 2>&1 || true' EXIT
docker run --detach --name buzz-context-fixture --network host \
  -e DATABASE_URL=postgres://fixture:fixture@127.0.0.1:18543/buzzfixture \
  -e REDIS_URL=redis://127.0.0.1:18679 \
  -e RELAY_URL=ws://127.0.0.1:18580 \
  -e BUZZ_BIND_ADDR=127.0.0.1:18580 \
  -e BUZZ_REQUIRE_AUTH_TOKEN=true \
  -e BUZZ_REQUIRE_RELAY_MEMBERSHIP=false \
  -e BUZZ_AUDIT_ENABLED=false "$image" >/dev/null
# This is a bounded internal fixture startup probe, not an agent waiting on CI.
for attempt in $(seq 1 30); do
  if curl -fsS -H 'Accept: application/nostr+json' http://127.0.0.1:18580/ >/dev/null; then
    BUZZ_CONTEXT_UPSTREAM_TEST=disposable-ci-only npx --no-install tsx test/upstream-relay.ts
    exit 0
  fi
  sleep 1
done
docker logs buzz-context-fixture
exit 1
