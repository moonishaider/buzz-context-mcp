// Actual isolated Buzz image integration. Not shipped, and never accepts a production URL.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { finalizeEvent,generateSecretKey,getPublicKey } from 'nostr-tools/pure';
import { BuzzClient } from '../src/client.js';
import { BuzzReader } from '../src/reader.js';
import { authHeader } from '../src/protocol.js';
if(process.env.BUZZ_CONTEXT_UPSTREAM_TEST!=='disposable-ci-only')throw new Error('Isolated test mode required.');
const relay='http://127.0.0.1:18580';
const alice=generateSecretKey(),bob=generateSecretKey(),guest=generateSecretKey();
const ac=new BuzzClient(relay,alice,{testLoopback:true}),bc=new BuzzClient(relay,bob,{testLoopback:true});
const a=new BuzzReader(ac),b=new BuzzReader(bc);
async function submit(key:Uint8Array,kind:number,content:string,tags:string[][]){
  const event=finalizeEvent({kind,content,tags,created_at:Math.floor(Date.now()/1000)},key);
  const body=JSON.stringify(event);const url=relay+'/events';
  const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',Authorization:authHeader(key,url,body)},body});
  assert.equal(response.status,200,`Synthetic setup rejected with HTTP ${response.status}`);
  const result=await response.json() as {accepted?:boolean;message?:string};
  assert.equal(result.accepted,true,'Synthetic setup event was rejected');return {event,result};
}
try{
  await ac.discovery();
  await submit(alice,0,JSON.stringify({name:'Fixture Alice'}),[]);
  await submit(bob,0,JSON.stringify({name:'Fixture Bob'}),[]);
  await submit(guest,0,JSON.stringify({name:'Fixture Guest'}),[]);
  const ach=randomUUID(),bch=randomUUID();
  for(const [key,id,name] of [[alice,ach,'fixture-alice-private'],[bob,bch,'fixture-bob-private']] as const){
    await submit(key,9007,'',[['h',id],['name',name],['visibility','private'],['channel_type','stream']]);
  }
  const am=(await submit(alice,9,'upstream-alice-only',[['h',ach]])).event;
  const bm=(await submit(bob,9,'upstream-bob-only',[['h',bch]])).event;
  assert.match(JSON.stringify(await a.history(ach)),/upstream-alice-only/);
  assert.match(JSON.stringify(await b.history(bch)),/upstream-bob-only/);
  await assert.rejects(()=>a.history(bch));await assert.rejects(()=>a.get(bm.id,bch));
  await assert.rejects(()=>a.thread(bm.id,bch));await assert.rejects(()=>a.attachments(bm.id,bch));
  assert.doesNotMatch(JSON.stringify(await a.search('upstream')),/upstream-bob-only/);
  assert.doesNotMatch(JSON.stringify(await ac.query({kinds:[9],ids:[bm.id],limit:1})),/upstream-bob-only/);
  const reply=(await submit(alice,9,'upstream-direct-reply',[['h',ach],['e',am.id,'','reply']])).event;
  assert.equal((await a.thread(reply.id,ach)).root.event_id,am.id);
  // Add and revoke a disposable user on an isolated channel; never operate on production membership.
  await submit(alice,9000,'',[['h',ach],['p',getPublicKey(bob)],['role','member']]);
  assert.match(JSON.stringify(await b.history(ach)),/upstream-alice-only/);
  await submit(alice,9001,'',[['h',ach],['p',getPublicKey(bob)]]);
  await assert.rejects(()=>b.history(ach));
  // DM between Alice and Guest must remain invisible to Bob.
  const requested=randomUUID();const dm=await submit(alice,41010,'',[['p',getPublicKey(guest)],['d',requested]]);
  const resultMessage=dm.result.message??'';
  const detail=resultMessage.startsWith('response:')?JSON.parse(resultMessage.slice(9)) as {channel_id?:string}:{};
  const dmId=detail.channel_id??requested;
  await submit(alice,9,'upstream-private-dm',[['h',dmId]]);
  assert.match(JSON.stringify(await a.history(dmId)),/upstream-private-dm/);
  await assert.rejects(()=>b.history(dmId));assert.doesNotMatch(JSON.stringify(await b.dms()),new RegExp(dmId));
  console.log(JSON.stringify({passed:true,scope:'isolated official Buzz image; disposable identities only',checks:['private-history','direct-ids','search','threads','attachment-parent','membership-revocation','DM-isolation']}));
}finally{ac.dispose();bc.dispose();alice.fill(0);bob.fill(0);guest.fill(0);}
