import { createServer } from 'node:http';
import { finalizeEvent, generateSecretKey, getPublicKey, verifyEvent, type Event } from 'nostr-tools/pure';
import { hash, tags, type Filter } from '../src/protocol.js';

export const A='11111111-1111-4111-8111-111111111111';
export const B='22222222-2222-4222-8222-222222222222';
export const PUBLIC='33333333-3333-4333-8333-333333333333';
export const DM='44444444-4444-4444-8444-444444444444';
export async function fixture(){
  const alice=generateSecretKey(),bob=generateSecretKey(),relayKey=generateSecretKey();
  const ap=getPublicKey(alice),bp=getPublicKey(bob);
  const allowed=new Map([[ap,new Set([A,PUBLIC,DM])],[bp,new Set([B,PUBLIC])]]);
  const sign=(kind:number,content:string,t:string[][]=[],time=1700000000)=>finalizeEvent({kind,content,tags:t,created_at:time},relayKey);
  const metadata=[sign(39000,'',[['d',A],['private'],['name','Alice private']]),sign(39000,'',[['d',B],['private']]),sign(39000,'',[['d',PUBLIC],['public']]),sign(39000,'',[['d',DM],['private'],['hidden'],['t','dm'],['p',ap]])];
  const events:Event[]=[sign(9,'alice-only-marker',[['h',A]]),sign(9,'bob-only-marker',[['h',B]]),sign(9,'public-marker',[['h',PUBLIC]]),sign(0,JSON.stringify({name:'Synthetic user'}))];
  const blobs=new Map<string,{bytes:Uint8Array;type:string}>();const replays=new Set<string>();const requests:{method?:string;path:string;filter?:Filter;auth?:Event}[]=[];
  let leaked:Event|undefined;let redirect=false;let oversized=false;let status=200;
  const server=createServer(async(req,res)=>{
    const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
    if(req.method==='GET'&&req.url==='/'){res.setHeader('Content-Type','application/nostr+json');res.end(JSON.stringify({name:'Synthetic fixture',supported_nips:[11,42,50]}));return;}
    const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));const body=Buffer.concat(chunks).toString();
    let auth:Event;
    try{
      const encoded=String(req.headers.authorization??'').replace(/^Nostr /,'');auth=JSON.parse(Buffer.from(encoded,req.url?.startsWith('/media/')?'base64url':'base64').toString());
      if(!verifyEvent(auth)||Math.abs(auth.created_at-Math.floor(Date.now()/1000))>60||replays.has(auth.id))throw new Error();
      if(req.url==='/query'){
        if(auth.kind!==27235||tags(auth,'u')[0]!==origin+req.url||tags(auth,'method')[0]!==req.method||tags(auth,'payload')[0]!==hash(body))throw new Error();
      }else if(auth.kind!==24242||tags(auth,'t')[0]!=='get'||tags(auth,'server')[0]!==new URL(origin).host)throw new Error();
      replays.add(auth.id);
    }catch{res.statusCode=401;res.end('synthetic auth denied');return;}
    requests.push({method:req.method,path:req.url??'',auth});
    if(status!==200){res.statusCode=status;res.end('private diagnostic must never appear');return;}
    if(redirect){res.statusCode=302;res.setHeader('Location',origin+'/events');res.end();return;}
    if(oversized){res.setHeader('Content-Length',String(20*1024*1024));res.end();return;}
    if(req.url?.startsWith('/media/')){
      const digest=req.url.slice(7).split('.')[0]!;const blob=blobs.get(digest);
      if(!blob){res.statusCode=404;res.end();return;}
      res.setHeader('Content-Type',blob.type);res.end(blob.bytes);return;
    }
    if(req.method!=='POST'||req.url!=='/query'){res.statusCode=405;res.end();return;}
    const [filter]=JSON.parse(body) as Filter[];if(!filter){res.statusCode=400;res.end();return;}
    requests.at(-1)!.filter=filter;
    const acl=allowed.get(auth.pubkey)??new Set<string>();
    const memberships=[...acl].map(id=>sign(39002,'',[['d',id],['p',auth.pubkey]]));
    const visible=[...metadata.filter(e=>acl.has(tags(e,'d')[0]!)),...memberships,...events.filter(e=>!tags(e,'h')[0]||acl.has(tags(e,'h')[0]!))];
    const matches=(e:Event)=>filter.kinds.includes(e.kind)&&(!filter.ids||filter.ids.includes(e.id))&&(!filter.authors||filter.authors.includes(e.pubkey))&&
      (filter.since===undefined||e.created_at>=filter.since)&&(filter.until===undefined||e.created_at<=filter.until)&&
      (!filter.search||e.content.includes(filter.search))&&Object.entries(filter).every(([key,value])=>!key.startsWith('#')||(value as string[]).some(v=>tags(e,key.slice(1)).includes(v)));
    let result=visible.filter(matches).sort((a,b)=>b.created_at-a.created_at||a.id.localeCompare(b.id));
    if(filter.search)result=result.slice(((filter.page??1)-1)*(filter.limit??10));
    result=result.slice(0,filter.limit??100);
    if(leaked)result=[leaked];
    res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${(server.address() as {port:number}).port}`;
  return {alice,bob,ap,bp,origin,events,allowed,requests,sign,blobs,
    leak:(e?:Event)=>{leaked=e;},redirect:(value:boolean)=>{redirect=value;},oversized:(value:boolean)=>{oversized=value;},status:(value:number)=>{status=value;},
    close:async()=>{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));alice.fill(0);bob.fill(0);relayKey.fill(0);}};
}
