import test from 'node:test';
import assert from 'node:assert/strict';
import { BuzzClient } from '../src/client.js';
import { BuzzReader } from '../src/reader.js';
import { fixture,A } from './fixture.js';

test('same-second history pages are complete without duplicates and cursors cannot cross identities or filters',async t=>{
  const f=await fixture();t.after(f.close);f.events.splice(0,f.events.length);
  for(let i=0;i<67;i++)f.events.push(f.sign(9,`Synthetic tied message ${i}`,[['h',A]],1700000000-Math.floor(i/31)));
  const c=new BuzzClient(f.origin,f.alice,{testLoopback:true});t.after(()=>c.dispose());const reader=new BuzzReader(c);
  let cursor:string|undefined;const ids:string[]=[];let firstCursor:string|undefined;
  do{const page=await reader.history(A,{limit:10,cursor});ids.push(...page.events.map(e=>e.event_id));cursor=page.next_cursor??undefined;firstCursor??=cursor;}while(cursor);
  assert.equal(ids.length,67);assert.equal(new Set(ids).size,67);
  await assert.rejects(()=>reader.channels({cursor:firstCursor}),/another request/);
  const other=new BuzzClient(f.origin,f.bob,{testLoopback:true});t.after(()=>other.dispose());
  await assert.rejects(()=>new BuzzReader(other).page({kinds:[9],'#h':[A]},{cursor:firstCursor}),/another request/);
});

test('oversized timestamp buckets stop explicitly rather than silently skipping older content',async t=>{
  const f=await fixture();t.after(f.close);f.events.splice(0,f.events.length);
  for(let i=0;i<501;i++)f.events.push(f.sign(9,`Synthetic bucket ${i}`,[['h',A]],1700000000));
  const c=new BuzzClient(f.origin,f.alice,{testLoopback:true});t.after(()=>c.dispose());const reader=new BuzzReader(c);
  let cursor:string|undefined;const ids=new Set<string>();
  for(let n=0;n<17;n++){const p=await reader.history(A,{limit:30,cursor});p.events.forEach(e=>ids.add(e.event_id));cursor=p.next_cursor??undefined;}
  assert.equal(ids.size,500);await assert.rejects(()=>reader.history(A,{limit:30,cursor}),/timestamp bucket/);
});
