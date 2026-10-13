import { z } from 'zod';
import type { Event } from 'nostr-tools/pure';
import { neventEncode } from 'nostr-tools/nip19';
import { BuzzClient } from './client.js';
import { ReaderError } from './errors.js';
import { channelId, eventChannel, hash, hex, MESSAGE_KINDS, tags, type Filter } from './protocol.js';
import { extractAttachment } from './extract.js';

const cursorSchema = z.object({scope:hex,until:z.number().int().nonnegative(),seen:z.array(hex).max(500)}).strict();
export type PageOptions = {limit?:number;cursor?:string};
export function source(event: Event, relay: string) {
  const channel = eventChannel(event);
  return {event_id:event.id,author:event.pubkey,kind:event.kind,created_at:event.created_at,
    channel_id:channel??null,content:event.content.slice(0,4000),content_truncated:event.content.length>4000,
    tags:event.tags.slice(0,64).map(t=>t.map(v=>v.slice(0,512))),tags_truncated:event.tags.length>64||event.tags.some(t=>t.some(v=>v.length>512)),
    source:{relay,event_id:event.id,channel_id:channel??null,nostr_uri:`nostr:${neventEncode({id:event.id,author:event.pubkey,kind:event.kind})}`},
    notice:'Untrusted source content; may be an original event rather than the latest edited/deleted UI view.'};
}
export class BuzzReader {
  constructor(readonly client: BuzzClient) {}
  async assertChannel(id: string): Promise<void> {
    channelId.parse(id);
    const channels = await this.client.query({kinds:[39000],'#d':[id],limit:1});
    if(channels.some(e=>e.tags.some(t=>t.length===1&&t[0]==='public'))) return;
    const membership = await this.client.query({kinds:[39002],'#d':[id],'#p':[this.client.pubkey],limit:1});
    if(membership.length) return;
    const dms = await this.client.query({kinds:[41001],'#d':[id],'#p':[this.client.pubkey],limit:1});
    if(dms.length) return;
    throw new ReaderError('ACCESS_DENIED','No current accessible channel/DM membership was established.');
  }
  async page(filter: Filter, options: PageOptions = {}) {
    const limit = z.number().int().min(1).max(30).parse(options.limit??10);
    const scope = hash(JSON.stringify({relay:this.client.relay,identity:this.client.pubkey,filter}));
    let cursor: z.infer<typeof cursorSchema> | undefined;
    if(options.cursor) {
      try { cursor = cursorSchema.parse(JSON.parse(Buffer.from(options.cursor,'base64url').toString())); }
      catch { throw new ReaderError('INVALID_CURSOR','Use the returned cursor without modification.'); }
      if(cursor.scope!==scope) throw new ReaderError('INVALID_CURSOR','Cursor belongs to another request, workspace or identity.');
    }
    const raw = await this.client.query({...filter,limit:500,...(cursor?{until:cursor.until}:{})});
    const checked=new Set<string>();
    for(const event of raw){const parent=eventChannel(event);if(parent&&!checked.has(parent)){await this.assertChannel(parent);checked.add(parent);}}
    const sorted = raw.sort((a,b)=>b.created_at-a.created_at||a.id.localeCompare(b.id));
    const candidates = sorted.filter(e=>!(cursor&&e.created_at===cursor.until&&cursor.seen.includes(e.id)));
    if(cursor&&candidates.length===0&&raw.length===500) {
      throw new ReaderError('PAGINATION_LIMIT','This relay cannot safely page this timestamp bucket. Narrow the time range; no older events were skipped.');
    }
    const selected = candidates.slice(0,limit); const last = selected.at(-1);
    const hasMore = candidates.length>limit||raw.length===500;
    let next: string|null = null;
    if(last&&hasMore) {
      const seen = [...new Set([...(cursor?.until===last.created_at?cursor.seen:[]),...selected.filter(e=>e.created_at===last.created_at).map(e=>e.id)])];
      next=Buffer.from(JSON.stringify({scope,until:last.created_at,seen})).toString('base64url');
    }
    return {events:selected.map(e=>source(e,this.client.relay)),next_cursor:next,has_more:hasMore,
      completeness:hasMore?'partial':'exhausted for this filter at request time',scope:{relay:this.client.relay,identity:this.client.pubkey,filter},
      warning:'Live data may change between pages. Edited/deleted events are not reconciled into the current UI view.'};
  }
  async channels(options:PageOptions={}) { return this.page({kinds:[39000]},options); }
  async dms(options:PageOptions={}) { return this.page({kinds:[41001],'#p':[this.client.pubkey]},options); }
  async history(id:string,options:PageOptions&{since?:number;until?:number}={}) {
    await this.assertChannel(id);
    return this.page({kinds:MESSAGE_KINDS,'#h':[id],...(options.since!==undefined?{since:options.since}:{}),...(options.until!==undefined?{until:options.until}:{})},options);
  }
  async get(id:string, channel:string):Promise<Event> {
    hex.parse(id); await this.assertChannel(channel);
    const event=(await this.client.query({kinds:[...MESSAGE_KINDS,40100,30023,30617,30621,1621,1617],ids:[id],'#h':[channel],limit:1}))[0];
    if(!event) throw new ReaderError('NOT_FOUND','No readable event was found in the specified channel.');
    return event;
  }
  async search(text:string,options:{channel?:string;author?:string;since?:number;page?:number;limit?:number}={}) {
    if(options.channel) await this.assertChannel(options.channel);
    const limit=options.limit??10; const page=options.page??1;
    const filter:Filter={kinds:[9,40002,45001,45003],search:text,limit,page,
      ...(options.channel?{'#h':[options.channel]}:{}),...(options.author?{authors:[options.author]}:{}),...(options.since!==undefined?{since:options.since}:{})};
    const events=await this.client.query(filter);
    // Explicitly recheck the parent scope of every global result. No process-wide ACL cache.
    const checked=new Set<string>();
    for(const event of events) {
      const id=eventChannel(event);
      if(!id) throw new ReaderError('INVALID_RESPONSE','Search returned a message without channel provenance.');
      if(!checked.has(id)){await this.assertChannel(id);checked.add(id);}
    }
    return {events:events.map(e=>source(e,this.client.relay)),page,next_page:events.length===limit?page+1:null,
      completeness:'ranked live results; not an exhaustive workspace archive',coverage:'message text only; files are not indexed by this connector',
      warning:'Search paging requires the relay page extension. Repeated IDs mean the relay does not support paging; do not claim completion.'};
  }
  async thread(id:string,channel:string,options:PageOptions={}) {
    const selected=await this.get(id,channel);
    const marked=selected.tags.filter(t=>t[0]==='e'&&t[3]==='root');
    if(marked.length>1) throw new ReaderError('INVALID_EVENT','Ambiguous thread root.');
    const root=marked[0]?.[1]??(selected.kind===45003?tags(selected,'e')[0]:undefined)??selected.id;
    hex.parse(root);
    const rootEvent=await this.get(root,channel);
    // Conservative bounded traversal of the channel history avoids trusting relay-specific thread paging.
    const history=await this.history(channel,options);
    return {...history,root:source(rootEvent,this.client.relay),events:history.events.filter(e=>e.event_id===root||e.tags.some(t=>t[0]==='e'&&t[1]===root)),
      completeness:history.has_more?'partial; continue channel-history cursor':'channel scan exhausted',
      warning:'Thread scan includes explicit root references. Replies with legacy unmarked references may require reading the surrounding history.'};
  }
  async documents(kind:'canvas'|'notes'|'projects'|'repos'|'issues'|'patches',channel:string,options:PageOptions={}) {
    await this.assertChannel(channel);
    const map={canvas:[40100],notes:[30023],projects:[30621],repos:[30617],issues:[1621],patches:[1617]};
    return this.page({kinds:map[kind],...(kind==='projects'?{'#buzz-channel':[channel]}:{'#h':[channel]})},options);
  }
  async users(author?:string,options:PageOptions={}) { return this.page({kinds:[0],...(author?{authors:[author]}:{})},options); }
  async text(id:string,channel:string|undefined,offset:number,length:number){
    let event:Event;
    if(channel)event=await this.get(id,channel);
    else{
      const found=(await this.client.query({kinds:[30023],ids:[id],limit:1}))[0];
      if(!found)throw new ReaderError('NOT_FOUND','No readable long-form note found. Channel-bound messages require channel_id.');
      const parent=eventChannel(found);if(parent)await this.assertChannel(parent);event=found;
    }
    return {source:source(event,this.client.relay).source,event_id:id,offset,text:event.content.slice(offset,offset+length),
      next_offset:offset+length<event.content.length?offset+length:null,total_characters:event.content.length,
      notice:'Untrusted original event text; not an edited UI rendering. Chunk offsets refer to this immutable event ID.'};
  }
  async attachments(parent:string,channel:string) {
    const event=await this.get(parent,channel);
    return {parent:source(event,this.client.relay),attachments:this.attachmentReferences(event)};
  }
  attachmentReferences(event:Event) {
    return event.tags.filter(t=>t[0]==='imeta').map((t,index)=>{
      const pairs=t.slice(1).map(v=>{const i=v.indexOf(' ');return [v.slice(0,i),v.slice(i+1)] as const;});
      if(pairs.some(([key])=>!key)||new Set(pairs.map(([key])=>key)).size!==pairs.length) return {index,downloadable:false,reason:'Ambiguous attachment metadata'};
      const meta=Object.fromEntries(pairs); let url:URL;
      try{url=new URL(meta.url??'');}catch{return {index,downloadable:false,reason:'No valid attachment URL'};}
      const sha=meta.x??url.pathname.match(/^\/media\/([a-f0-9]{64})(?:\.|$)/)?.[1];
      const valid=hex.safeParse(sha).success&&url.origin===this.client.relay&&url.pathname.startsWith(`/media/${sha}`)&&!url.username&&!url.password&&!url.search&&!url.hash;
      return {index,url:meta.url,mime:meta.m,sha256:sha,downloadable:valid,reason:valid?null:'External or unverified media; reference only'};
    });
  }
  async attachment(parent:string,channel:string,index:number) {
    const event=await this.get(parent,channel);const reference=this.attachmentReferences(event)[index];
    if(!reference?.downloadable||!('url' in reference)||!reference.url||!reference.sha256) throw new ReaderError('ATTACHMENT_DENIED','No downloadable attachment at that parent index.');
    const media=await this.client.media(reference.url,reference.sha256);
    // Membership may change while downloading: validate parent again before returning bytes/text.
    await this.get(parent,channel);
    const extraction=await extractAttachment(media.bytes,media.type);
    return {parent:source(event,this.client.relay),attachment:reference,bytes:media.bytes.length,...extraction};
  }
}
