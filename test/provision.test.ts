import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { generateSecretKey,getPublicKey } from 'nostr-tools/pure';
import { provision } from '../src/provision.js';
import { readConfig,saveProfile } from '../src/config.js';
import { BuzzClient } from '../src/client.js';
import { loadKey,deleteKey } from '../src/credentials.js';

test('provisioning refuses absent consent, identity mismatch, failed authentication and expired sessions without saving',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'buzz-provision-'));const old=process.env.BUZZ_CONTEXT_CONFIG_DIR;process.env.BUZZ_CONTEXT_CONFIG_DIR=dir;
  t.after(async()=>{if(old===undefined)delete process.env.BUZZ_CONTEXT_CONFIG_DIR;else process.env.BUZZ_CONTEXT_CONFIG_DIR=old;await rm(dir,{recursive:true,force:true});});
  const key=generateSecretKey();t.after(()=>key.fill(0));const pubkey=getPublicKey(key);const input=()=>({relay:'https://fixture.example',pubkey,secret:Buffer.from(key).toString('hex'),consent:true});
  await assert.rejects(()=>provision('test',{...input(),consent:false}),/consent/);
  await assert.rejects(()=>provision('test',{...input(),pubkey:'0'.repeat(64)}),/does not match/);
  const discover=t.mock.method(BuzzClient.prototype,'discovery',async()=>{throw new Error('synthetic auth failure');});
  await assert.rejects(()=>provision('test',input()),/synthetic auth failure/);discover.mock.restore();
  t.mock.method(BuzzClient.prototype,'discovery',async()=>({}));t.mock.method(BuzzClient.prototype,'query',async()=>[]);
  await assert.rejects(()=>provision('test',input(),()=>false),/expired/);
  assert.deepEqual((await readConfig()).profiles,{});
  await saveProfile('test',{relay:input().relay,pubkey});await assert.rejects(()=>provision('test',input()),/already exists/);
  assert.equal((await readConfig()).profiles.test?.pubkey,pubkey);
});
test('shared provisioning persists and verifies disposable credentials, and rolls back expiration during storage',{skip:process.env.BUZZ_CONTEXT_TEST_KEYRING!=='1'},async t=>{
  const dir=await mkdtemp(join(tmpdir(),'buzz-provision-keyring-'));const old=process.env.BUZZ_CONTEXT_CONFIG_DIR;process.env.BUZZ_CONTEXT_CONFIG_DIR=dir;
  const key=generateSecretKey();const profile={relay:'https://fixture.example',pubkey:getPublicKey(key)};const input=()=>({...profile,secret:Buffer.from(key).toString('hex'),consent:true});
  t.after(async()=>{await deleteKey('test',profile).catch(()=>{});await deleteKey('expired',profile).catch(()=>{});key.fill(0);if(old===undefined)delete process.env.BUZZ_CONTEXT_CONFIG_DIR;else process.env.BUZZ_CONTEXT_CONFIG_DIR=old;await rm(dir,{recursive:true,force:true});});
  t.mock.method(BuzzClient.prototype,'discovery',async()=>({}));t.mock.method(BuzzClient.prototype,'query',async()=>[]);
  const supplied=input();assert.equal((await provision('test',supplied)).configured,true);assert.equal(supplied.secret,'');
  const loaded=await loadKey('test',profile);assert.deepEqual(loaded,key);loaded.fill(0);assert.deepEqual((await readConfig()).profiles.test,profile);
  let checks=0;await assert.rejects(()=>provision('expired',input(),()=>++checks===1),/expired/);
  assert.equal((await readConfig()).profiles.expired,undefined);await assert.rejects(()=>loadKey('expired',profile),/No connector credential/);
});
