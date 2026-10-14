#!/usr/bin/env bash
set -euo pipefail
image='ghcr.io/block/buzz@sha256:848fbf014382f152f126af5c85437cdcbe4f205126ef9a89f5f0133a421a2cfa'
task_fixture_env=$(mktemp)
trap 'docker rm -f buzz-context-fixture buzz-context-objectstore >/dev/null 2>&1 || true; rm -f "$task_fixture_env"' EXIT
# The official relay probes its object store during startup; use a fully isolated S3-compatible fixture.
docker run --detach --name buzz-context-objectstore --network host \
  -e MINIO_ROOT_USER=fixture_access -e MINIO_ROOT_PASSWORD=fixture_password \
  'pgsty/silo:RELEASE.2026-09-16T00-00-00Z@sha256:635197cb9f36d01bee221d34d1c7d7960f6a95c48b0b6c01d99cd13bdae51a46' \
  server /data --address 127.0.0.1:19000 --console-address 127.0.0.1:19001 >/dev/null
for attempt in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:19000/minio/health/live >/dev/null 2>&1; then break; fi
  sleep 1
done
docker run --rm --network host --entrypoint /bin/sh \
  'pgsty/mc:RELEASE.2026-09-16T00-00-00Z@sha256:cfc83108c3abb371f8fb84d99c1fdc88f8c237e022409b0081fb7c0a3be634dd' \
  -c 'mc alias set fixture http://127.0.0.1:19000 fixture_access fixture_password >/dev/null && mc mb --ignore-existing fixture/buzz-fixture >/dev/null'
# The key is generated only for this disposable test relay, never printed or published.
node --input-type=module -e "import {generateSecretKey} from 'nostr-tools/pure'; import {writeFileSync} from 'node:fs'; const key=generateSecretKey(); writeFileSync(process.argv[1], 'BUZZ_RELAY_PRIVATE_KEY='+Buffer.from(key).toString('hex')+'\\n',{mode:0o600}); key.fill(0);" "$task_fixture_env"
docker run --detach --name buzz-context-fixture --network host \
  --env-file "$task_fixture_env" \
  -e DATABASE_URL=postgres://fixture:fixture@127.0.0.1:18543/buzzfixture \
  -e REDIS_URL=redis://127.0.0.1:18679 \
  -e RELAY_URL=ws://127.0.0.1:18580 \
  -e BUZZ_BIND_ADDR=127.0.0.1:18580 \
  -e BUZZ_REQUIRE_AUTH_TOKEN=true \
  -e BUZZ_REQUIRE_RELAY_MEMBERSHIP=false \
  -e BUZZ_AUTO_MIGRATE=true \
  -e BUZZ_S3_ENDPOINT=http://127.0.0.1:19000 \
  -e BUZZ_S3_ACCESS_KEY=fixture_access \
  -e BUZZ_S3_SECRET_KEY=fixture_password \
  -e BUZZ_S3_BUCKET=buzz-fixture \
  -e BUZZ_S3_REGION=us-east-1 \
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
