import test from 'node:test';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { BuzzClient, boundedBody } from '../src/client.js';
import { BuzzReader } from '../src/reader.js';
import { createServer } from '../src/server.js';
import { authHeader, hash, normalizeRelay } from '../src/protocol.js';
import { fixture,A,B } from './fixture.js';

test('two synthetic identities cannot cross private history, IDs, DMs, search, threads or attachments',async t=>{
  const f=await fixture();t.after(f.close);
  const ac=new BuzzClient(f.origin,f.alice,{testLoopback:true}),bc=new BuzzClient(f.origin,f.bob,{testLoopback:true});t.after(()=>{ac.dispose();bc.dispose();});
  const a=new BuzzReader(ac),b=new BuzzReader(bc);const bob=f.events[1]!;
  assert.match(JSON.stringify(await a.history(A)),/alice-only-marker/);
  assert.match(JSON.stringify(await b.history(B)),/bob-only-marker/);
  for(const request of [()=>a.history(B),()=>a.get(bob.id,B),()=>a.thread(bob.id,B),()=>a.attachments(bob.id,B),()=>a.attachment(bob.id,B,0)])await assert.rejects(request,/accessible channel\/DM/);
  assert.doesNotMatch(JSON.stringify(await a.dms()),new RegExp(B));
  assert.doesNotMatch(JSON.stringify(await a.search('marker')),/bob-only-marker/);
  f.allowed.get(f.ap)!.delete(A);
  await assert.rejects(()=>a.history(A),/accessible channel\/DM/);
});

test('forged/leaked response provenance fails closed',async t=>{
  const f=await fixture();t.after(f.close);const client=new BuzzClient(f.origin,f.alice,{testLoopback:true});t.after(()=>client.dispose());
  f.leak(f.events[1]);await assert.rejects(()=>client.query({kinds:[9],'#h':[A],limit:1}),/outside the requested scope/);
  const altered={...f.events[0]!,content:'unsigned alteration'};f.leak(altered);
  await assert.rejects(()=>client.query({kinds:[9],limit:1}),/invalid, duplicate or out-of-scope/);
});

test('HTTP auth binds identity, URL, method and body; timestamps, replay and tampering are denied',async t=>{
  const f=await fixture();t.after(f.close);const url=f.origin+'/query';const body=JSON.stringify([{kinds:[9],limit:1}]);
  const header=authHeader(f.alice,url,body);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:header},body})).status,200);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:header},body})).status,401);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:authHeader(f.alice,url,body)},body:JSON.stringify([{kinds:[0]}])})).status,401);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:authHeader(f.alice,f.origin+'/events',body)},body})).status,401);
  const stale=f.sign(27235,'',[['u',url],['method','POST'],['payload',hash(body)]],Math.floor(Date.now()/1000)-120);
  assert.equal((await fetch(url,{method:'POST',headers:{Authorization:`Nostr ${Buffer.from(JSON.stringify(stale)).toString('base64')}`},body})).status,401);
});

test('redirects, oversized downloads, write kinds and unsafe relay URLs are refused without exposing diagnostics',async t=>{
  const f=await fixture();t.after(f.close);const client=new BuzzClient(f.origin,f.alice,{testLoopback:true});t.after(()=>client.dispose());
  assert.throws(()=>normalizeRelay('http://example.com'),/HTTPS/);
  assert.throws(()=>normalizeRelay('https://user:pass@example.com'),/HTTPS/);
  assert.throws(()=>normalizeRelay('https://example.com/path'),/HTTPS/);
  await assert.rejects(()=>client.query({kinds:[9035],limit:1}),/read-only/);
  f.redirect(true);await assert.rejects(()=>client.query({kinds:[9],limit:1}),/request failed/);f.redirect(false);
  assert.ok(!f.requests.some(r=>r.path==='/events'));
  f.oversized(true);await assert.rejects(()=>client.query({kinds:[9],limit:1}),/download limit/);f.oversized(false);
  f.status(403);await assert.rejects(()=>client.query({kinds:[9],limit:1}),e=>e instanceof Error&&!e.message.includes('private diagnostic'));
  await assert.rejects(()=>boundedBody(new Response('abcdef'),3),/download limit/);
  client.dispose();await assert.rejects(()=>client.query({kinds:[9]}),/disconnected/);
});

test('attachment download requires parent, origin and hash; membership is checked again',async t=>{
  const f=await fixture();t.after(f.close);const client=new BuzzClient(f.origin,f.alice,{testLoopback:true});t.after(()=>client.dispose());const reader=new BuzzReader(client);
  const bytes=new TextEncoder().encode('Synthetic attachment');const sha=hash(bytes);f.blobs.set(sha,{bytes,type:'text/plain'});
  const parent=f.sign(9,'Attachment',[['h',A],['imeta',`url ${f.origin}/media/${sha}.txt`,`x ${sha}`]]);f.events.push(parent);
  assert.equal((await reader.attachment(parent.id,A,0)).text,'Synthetic attachment');
  const external=f.sign(9,'External',[['h',A],['imeta',`url https://example.com/media/${sha}`,`x ${sha}`]]);f.events.push(external);
  await assert.rejects(()=>reader.attachment(external.id,A,0),/downloadable attachment/);
  f.blobs.set(sha,{bytes:new TextEncoder().encode('tampered'),type:'text/plain'});
  await assert.rejects(()=>reader.attachment(parent.id,A,0),/hash verification/);
  f.allowed.get(f.ap)!.delete(A);await assert.rejects(()=>reader.attachment(parent.id,A,0),/accessible channel\/DM/);
});

test('MCP handshake advertises only read tools and rejects unauthorized/tool injection requests',async t=>{
  const f=await fixture();t.after(f.close);const bc=new BuzzClient(f.origin,f.alice,{testLoopback:true});t.after(()=>bc.dispose());
  const server=createServer(new BuzzReader(bc));const client=new Client({name:'synthetic-mcp-test',version:'1.0.0'});
  const [ct,st]=InMemoryTransport.createLinkedPair();await server.connect(st);await client.connect(ct);t.after(async()=>{await client.close();await server.close();});
  const listing=await client.listTools();assert.equal(listing.tools.length,13);
  assert.ok(listing.tools.every(tool=>tool.annotations?.readOnlyHint===true&&tool.annotations?.destructiveHint===false));
  assert.ok(!listing.tools.some(tool=>/send|write|sign|shell|configure|disconnect/.test(tool.name)));
  const result=await client.callTool({name:'read_channel_history',arguments:{channel_id:B}});assert.equal(result.isError,true);assert.doesNotMatch(JSON.stringify(result),/bob-only-marker/);
  const good=await client.callTool({name:'read_channel_history',arguments:{channel_id:A}});assert.match(JSON.stringify(good),/alice-only-marker/);
  assert.doesNotMatch(JSON.stringify(good),/nsec|private diagnostic/);
});
test('long event content is retrieved in bounded immutable chunks with fresh access checks',async t=>{
  const f=await fixture();t.after(f.close);const client=new BuzzClient(f.origin,f.alice,{testLoopback:true});t.after(()=>client.dispose());const reader=new BuzzReader(client);
  const event=f.sign(9,'prefix'+('x'.repeat(8000))+'suffix',[['h',A]]);f.events.push(event);
  const first=await reader.text(event.id,A,0,4000);assert.equal(first.next_offset,4000);assert.match(first.text,/^prefix/);
  const last=await reader.text(event.id,A,8000,4000);assert.equal(last.next_offset,null);assert.match(last.text,/suffix$/);
  f.allowed.get(f.ap)!.delete(A);await assert.rejects(()=>reader.text(event.id,A,4000,4000),/accessible channel\/DM/);
});
test('Buzz direct-reply and nested NIP-10 markers resolve the actual thread root',async t=>{
  const f=await fixture();t.after(f.close);const client=new BuzzClient(f.origin,f.alice,{testLoopback:true});t.after(()=>client.dispose());const reader=new BuzzReader(client);
  const root=f.sign(9,'Synthetic root',[['h',A]],1700000002);
  const direct=f.sign(9,'Synthetic direct reply',[['h',A],['e',root.id,'','reply']],1700000003);
  const nested=f.sign(9,'Synthetic nested reply',[['h',A],['e',root.id,'','root'],['e',direct.id,'','reply']],1700000004);
  f.events.push(root,direct,nested);
  const first=await reader.thread(direct.id,A);assert.equal(first.root.event_id,root.id);assert.ok(first.events.some(e=>e.event_id===nested.id));
  const second=await reader.thread(nested.id,A);assert.equal(second.root.event_id,root.id);
});
