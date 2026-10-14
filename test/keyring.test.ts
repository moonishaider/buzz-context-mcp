import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { generateSecretKey,getPublicKey } from 'nostr-tools/pure';
import { storeKey,loadKey,deleteKey } from '../src/credentials.js';

test('OS credential store round trip with disposable identity, then removal',{skip:process.env.BUZZ_CONTEXT_TEST_KEYRING!=='1'},async()=>{
  const key=generateSecretKey();const profile={relay:'https://fixture.example',pubkey:getPublicKey(key)};const name=`fixture-${randomUUID()}`;
  try{await storeKey(name,profile,key);const loaded=await loadKey(name,profile);assert.deepEqual(loaded,key);loaded.fill(0);await deleteKey(name,profile);await assert.rejects(()=>loadKey(name,profile),/No connector credential/);}
  finally{await deleteKey(name,profile).catch(()=>{});key.fill(0);}
});


test('secure-store verification failure attempts cleanup without exposing key values',async t=>{
  const {AsyncEntry}=await import('@napi-rs/keyring');let removed=0;
  t.mock.method(AsyncEntry.prototype,'setSecret',async()=>{});
  t.mock.method(AsyncEntry.prototype,'getSecret',async()=>{throw new Error('synthetic-private-value');});
  const deletion=t.mock.method(AsyncEntry.prototype,'deleteCredential',async()=>{removed++;return true;});
  const key=generateSecretKey();t.after(()=>key.fill(0));const profile={relay:'https://fixture.example',pubkey:getPublicKey(key)};
  await assert.rejects(()=>storeKey('failure',profile,key),error=>{assert.match(String(error),/Secure credential storage/);assert.doesNotMatch(String(error),/synthetic-private-value/);return true;});assert.equal(removed,1);
  deletion.mock.restore();t.mock.method(AsyncEntry.prototype,'deleteCredential',async()=>{throw new Error('synthetic-private-value');});
  await assert.rejects(()=>storeKey('failure',profile,key),/cleanup could not be confirmed/);
});
