import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { startSetupServer } from '../src/setup-server.js';
import { ReaderError } from '../src/errors.js';

const input={relay:'https://fixture.example',pubkey:'a'.repeat(64),secret:'synthetic-only-secret',password:'',consent:true};
function post(url:string,body:unknown=input,headers:Record<string,string>={}){
  const u=new URL(url);return fetch(new URL('/configure',u),{method:'POST',headers:{Origin:u.origin,Authorization:`Bearer ${u.hash.slice(1)}`,'Content-Type':'application/json',...headers},body:JSON.stringify(body)});
}
test('local form headers, escaped defaults and cross-site/host/token/content-type rejection',async t=>{
  let calls=0;const s=await startSetupServer({profile:'<script>',relay:'" onfocus="bad',configure:async()=>{calls++;}});t.after(s.close);
  const u=new URL(s.url);const page=await fetch(u);const html=await page.text();
  assert.equal(page.status,200);assert.equal(page.headers.get('cache-control'),'no-store');assert.equal(page.headers.get('referrer-policy'),'no-referrer');
  assert.match(page.headers.get('content-security-policy')!,/frame-ancestors 'none'/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<code><script>/);assert.ok(!html.includes(u.hash.slice(1)));
  for(const headers of [{Origin:'https://evil.example'},{Origin:'null'},{Origin:''},{Authorization:'Bearer wrong'},{'Content-Type':'text/plain'},{'Sec-Fetch-Site':'cross-site'}])assert.equal((await post(s.url,input,headers)).status,403);
  const hostStatus=await new Promise<number>(resolve=>{const req=request({hostname:'127.0.0.1',port:u.port,path:'/',headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode!);});req.end();});assert.equal(hostStatus,403);
  assert.equal((await fetch(new URL('/configure',u),{method:'OPTIONS'})).status,404);
  assert.equal((await fetch(new URL('/?token=invalid',u))).status,404);
  assert.equal((await post(s.url,{...input,consent:false})).status,400);
  assert.equal((await post(s.url,{...input,secret:'x'.repeat(9000)})).status,413);
  assert.equal(calls,0);
  const accepted=await post(s.url);assert.equal(accepted.status,200);assert.deepEqual(await s.done,{configured:true});assert.equal(calls,1);
  await assert.rejects(()=>post(s.url));
});
test('single-use authorization rejects a concurrent submission and clears received credentials',async t=>{
  let release!:()=>void;let entered!:()=>void;const started=new Promise<void>(resolve=>{entered=resolve;});let received:typeof input|undefined;let calls=0;
  const s=await startSetupServer({profile:'test',configure:async data=>{received=data as typeof input;calls++;entered();await new Promise<void>(resolve=>{release=resolve;});}});t.after(s.close);
  const first=post(s.url);await started;
  assert.equal((await post(s.url)).status,410);assert.equal(calls,1);release();assert.equal((await first).status,200);await s.done;assert.equal(received!.secret,'');assert.equal(received!.password,'');
});
test('setup failures are redacted, terminal for the session and do not leak credentials',async t=>{
  const s=await startSetupServer({profile:'test',configure:async()=>{throw new Error(input.secret);}});t.after(s.close);
  const response=await post(s.url);const body=await response.text();assert.equal(response.status,400);assert.ok(!body.includes(input.secret));assert.match(body,/Setup failed/);assert.deepEqual(await s.done,{failed:true});
});
test('safe identity errors are actionable without echoing submitted fields',async t=>{
  const s=await startSetupServer({profile:'test',configure:async()=>{throw new ReaderError('IDENTITY_MISMATCH','The supplied key does not match the expected public identity.');}});t.after(s.close);
  assert.match(await (await post(s.url)).text(),/does not match/);await s.done;
});
test('cancel and expiry shut down the listener; expiry invalidates in-flight persistence',async t=>{
  const s=await startSetupServer({profile:'test',configure:async()=>{assert.fail('Must not provision');}});t.after(s.close);const u=new URL(s.url);
  assert.equal((await fetch(new URL('/cancel',u),{method:'POST',headers:{Origin:u.origin,Authorization:`Bearer ${u.hash.slice(1)}`,'Content-Type':'application/json'},body:'{}'})).status,200);assert.deepEqual(await s.done,{cancelled:true});
  let active:(()=>boolean)|undefined;let release!:()=>void;
  const exp=await startSetupServer({profile:'test',ttlMs:150,configure:async(_,check)=>{active=check;await new Promise<void>(resolve=>{release=resolve;});assert.equal(check(),false);}});t.after(exp.close);
  const pending=post(exp.url).catch(()=>undefined);assert.deepEqual(await exp.done,{expired:true});assert.equal(active!(),false);release();await pending;
});
