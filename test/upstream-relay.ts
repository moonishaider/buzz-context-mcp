// Actual isolated Buzz image integration. Not shipped, and never accepts a production URL.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { deflateSync } from 'node:zlib';
import { finalizeEvent,generateSecretKey,getPublicKey } from 'nostr-tools/pure';
import { BuzzClient } from '../src/client.js';
import { BuzzReader } from '../src/reader.js';
import { authHeader,hash } from '../src/protocol.js';
if(process.env.BUZZ_CONTEXT_UPSTREAM_TEST!=='disposable-ci-only')throw new Error('Isolated test mode required.');
const relay='http://127.0.0.1:18580';
const alice=generateSecretKey(),bob=generateSecretKey(),guest=generateSecretKey();
const ac=new BuzzClient(relay,alice,{testLoopback:true}),bc=new BuzzClient(relay,bob,{testLoopback:true});
const a=new BuzzReader(ac),b=new BuzzReader(bc);
async function submit(key:Uint8Array,kind:number,content:string,tags:string[][]){
  const event=finalizeEvent({kind,content,tags,created_at:Math.floor(Date.now()/1000)},key);
  const body=JSON.stringify(event);const url=relay+'/events';
  const response=await fetch(url,{method:'POST',redirect:'error',signal:AbortSignal.timeout(20000),headers:{'Content-Type':'application/json',Authorization:authHeader(key,url,body)},body});
  if(response.status!==200)throw new Error(`Disposable setup kind ${kind} HTTP ${response.status}: ${(await response.text()).slice(0,1000)}`);
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
  const search=JSON.stringify(await a.search('upstream'));
  assert.match(search,/upstream-alice-only/);assert.doesNotMatch(search,/upstream-bob-only/);
  assert.doesNotMatch(JSON.stringify(await ac.query({kinds:[9],ids:[bm.id],limit:1})),/upstream-bob-only/);
  const reply=(await submit(alice,9,'upstream-direct-reply',[['h',ach],['e',am.id,'','reply']])).event;
  assert.equal((await a.thread(reply.id,ach)).root.event_id,am.id);
  // Upload is test setup only, fixed to loopback and excluded from the MCP package.
  const crc=(data:Uint8Array)=>{let value=0xffffffff;for(const byte of data){value^=byte;for(let bit=0;bit<8;bit++)value=(value>>>1)^((value&1)?0xedb88320:0);}return (value^0xffffffff)>>>0;};
  const chunk=(name:string,data:Uint8Array)=>{const body=Buffer.concat([Buffer.from(name),data]);const n=Buffer.alloc(4),c=Buffer.alloc(4);n.writeUInt32BE(data.length);c.writeUInt32BE(crc(body));return Buffer.concat([n,body,c]);};
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(1,0);ihdr.writeUInt32BE(1,4);ihdr[8]=8;ihdr[9]=6;
  const png=Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',ihdr),chunk('IDAT',deflateSync(Buffer.from([0,40,80,120,255]))),chunk('IEND',new Uint8Array())]);const digest=hash(png);
  const uploadAuth=()=>{
    const event=finalizeEvent({kind:24242,created_at:Math.floor(Date.now()/1000),content:'Disposable fixture upload',tags:[['t','upload'],['x',digest],['expiration',String(Math.floor(Date.now()/1000)+60)],['server','127.0.0.1:18580'],['nonce',randomUUID()]]},alice);
    return `Nostr ${Buffer.from(JSON.stringify(event)).toString('base64url')}`;
  };
  let uploaded:Response|undefined;
  for(const path of ['/upload','/media/upload']){
    uploaded=await fetch(relay+path,{method:'PUT',redirect:'error',signal:AbortSignal.timeout(20000),headers:{Authorization:uploadAuth(),'Content-Type':'image/png','X-SHA-256':digest},body:png});
    if(uploaded.status!==404&&uploaded.status!==405)break;await uploaded.body?.cancel();
  }
  if(!uploaded?.ok){const detail=uploaded?(await uploaded.text()).slice(0,1000):'No response';throw new Error(`Disposable fixture upload HTTP ${uploaded?.status}: ${detail}`);}
  const descriptor=await uploaded.json() as {url:string;sha256:string;type:string;size:number;dim?:string};assert.equal(descriptor.sha256,digest);
  const imeta=['imeta',`url ${descriptor.url}`,`x ${digest}`,`m ${descriptor.type}`,`size ${descriptor.size}`,...(descriptor.dim?[`dim ${descriptor.dim}`]:[])];
  const attachment=(await submit(alice,9,'upstream-image-parent',[['h',ach],imeta])).event;
  assert.equal((await a.attachment(attachment.id,ach,0)).status,'image');
  await assert.rejects(()=>b.attachment(attachment.id,ach,0));
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
  assert.match(JSON.stringify(await a.dms()),new RegExp(dmId));
  await assert.rejects(()=>b.history(dmId));assert.doesNotMatch(JSON.stringify(await b.dms()),new RegExp(dmId));
  console.log(JSON.stringify({passed:true,scope:'isolated official Buzz image; disposable identities only',checks:['private-history','direct-ids','positive-and-private-search','threads','hashed-image-extraction-and-private-parent','membership-revocation','positive-and-private-DM-discovery']}));
}finally{ac.dispose();bc.dispose();alice.fill(0);bob.fill(0);guest.fill(0);}
