import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getProfile, saveProfile, withConfigLock } from '../src/config.js';
import { generateSecretKey,getPublicKey } from 'nostr-tools/pure';

test('profile persistence contains only public configuration and disconnect removes it',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'buzz-reader-profile-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  const key=generateSecretKey();t.after(()=>key.fill(0));const profile={relay:'https://example.com',pubkey:getPublicKey(key)};
  await saveProfile('test',profile,dir);assert.deepEqual(await getProfile('test',dir),profile);
  const data=await readFile(join(dir,'profiles.json'),'utf8');assert.ok(!data.includes(Buffer.from(key).toString('hex')));assert.doesNotMatch(data,/nsec/);
  await saveProfile('test',{...profile,disabled:true},dir);await assert.rejects(()=>getProfile('test',dir),/disabled/);
  assert.equal((await getProfile('test',dir,true)).disabled,true);
  await saveProfile('test',null,dir);await assert.rejects(()=>getProfile('test',dir),/not configured/);
  await writeFile(join(dir,'profiles.json'),'{bad');await assert.rejects(()=>getProfile('test',dir),/malformed/);
});
test('configuration lock refuses concurrent provisioning without clobbering it',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'buzz-reader-lock-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  await withConfigLock(async()=>{await assert.rejects(()=>withConfigLock(async()=>{},dir),/Another provisioning/);},dir);
  await withConfigLock(async()=>{},dir);
});
