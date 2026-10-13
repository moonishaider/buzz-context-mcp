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
