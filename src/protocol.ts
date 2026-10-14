import { createHash, randomUUID } from 'node:crypto';
import { finalizeEvent, getPublicKey, verifyEvent, type Event } from 'nostr-tools/pure';
import { z } from 'zod';
import { ReaderError } from './errors.js';

export const hex = z.string().regex(/^[a-f0-9]{64}$/);
export const channelId = z.string().uuid();
export const eventSchema = z.object({
  id: hex, pubkey: hex, sig: z.string().regex(/^[a-f0-9]{128}$/),
  kind: z.number().int().nonnegative(), created_at: z.number().int().nonnegative(),
  content: z.string().max(524288), tags: z.array(z.array(z.string().max(524288))).max(2048)
});
export type Filter = {
  kinds: number[]; ids?: string[]; authors?: string[]; limit?: number;
  since?: number; until?: number; search?: string; page?: number;
  thread_cursor?: number; thread_cursor_id?: string;
  [tag: `#${string}`]: string[] | undefined;
};
export const MESSAGE_KINDS = [9, 40002, 40003, 40008, 45001, 45003];
export const READ_KINDS = new Set([0, 9, 39000, 39002, 40002, 40003, 40008,
  45001, 45003, 40100, 30023, 30621, 30617, 1621, 1617, 1630, 1631, 1632, 1633]);
export function tags(event: Event, key: string): string[] {
  return event.tags.filter(t => t[0] === key && t[1] !== undefined).map(t => t[1]!);
}
export function eventChannel(event: Event): string | undefined {
  const ids = tags(event, 'h');
  if (ids.length > 1 || (ids[0] !== undefined && !channelId.safeParse(ids[0]).success)) {
    throw new ReaderError('INVALID_EVENT', 'The event has ambiguous or invalid channel provenance.');
  }
  return ids[0];
}
export function normalizeRelay(input: string, testLoopback = false): string {
  let u: URL;
  try { u = new URL(input); } catch { throw new ReaderError('INVALID_RELAY', 'Use a valid HTTPS Buzz relay URL.'); }
  if (u.protocol === 'wss:') u.protocol = 'https:';
  const loopback = testLoopback && u.protocol === 'http:' && u.hostname === '127.0.0.1';
  if ((!loopback && u.protocol !== 'https:') || u.username || u.password || u.search || u.hash || u.pathname !== '/') {
    throw new ReaderError('INVALID_RELAY', 'Relay must be an HTTPS origin without credentials, path, query or fragment.');
  }
  return u.origin;
}
export function validateFilter(filter: Filter): void {
  if (!filter.kinds.length || filter.kinds.some(k => !READ_KINDS.has(k)) ||
      (filter.limit !== undefined && (!Number.isInteger(filter.limit) || filter.limit < 1 || filter.limit > 500))) {
    throw new ReaderError('INVALID_FILTER', 'The requested filter is outside the fixed read-only scope.');
  }
  const allowed = new Set(['kinds','ids','authors','limit','since','until','search','page','thread_cursor','thread_cursor_id','#h','#d','#p','#e','#a','#t','#buzz-channel']);
  if (Object.keys(filter).some(k => !allowed.has(k))) throw new ReaderError('INVALID_FILTER', 'Unsupported filter field.');
  for(const name of ['ids','authors'] as const)if(filter[name]&&!z.array(hex).min(1).max(100).safeParse(filter[name]).success)throw new ReaderError('INVALID_FILTER','Invalid identity/event filter.');
  for(const name of ['since','until','thread_cursor'] as const)if(filter[name]!==undefined&&!z.number().int().nonnegative().safeParse(filter[name]).success)throw new ReaderError('INVALID_FILTER','Invalid time filter.');
  if(filter.page!==undefined&&!z.number().int().min(1).max(100).safeParse(filter.page).success)throw new ReaderError('INVALID_FILTER','Invalid page.');
  if (JSON.stringify(filter).length > 32768) throw new ReaderError('INVALID_FILTER', 'Filter exceeds the request size limit.');
}
export function hash(data: string | Uint8Array): string { return createHash('sha256').update(data).digest('hex'); }
export function authHeader(key: Uint8Array, url: string, body: string): string {
  const event = finalizeEvent({ kind: 27235, created_at: Math.floor(Date.now()/1000), content: '',
    tags: [['u',url],['method','POST'],['payload',hash(body)],['nonce',randomUUID()]] }, key);
  return `Nostr ${Buffer.from(JSON.stringify(event)).toString('base64')}`;
}
export function mediaAuthHeader(key: Uint8Array, url: string, sha256: string): string {
  const event = finalizeEvent({ kind: 24242, created_at: Math.floor(Date.now()/1000), content: 'Read attachment',
    tags: [['t','get'],['x',sha256],['expiration',String(Math.floor(Date.now()/1000)+60)],['server',new URL(url).host],['nonce',randomUUID()]] }, key);
  return `Nostr ${Buffer.from(JSON.stringify(event)).toString('base64url')}`;
}
export function checkedEvents(input: unknown, filter: Filter): Event[] {
  const parsed = z.array(eventSchema).max(500).safeParse(input);
  if (!parsed.success) throw new ReaderError('INVALID_RESPONSE','Relay returned an unsupported event response.');
  const seen = new Set<string>();
  const events = parsed.data as Event[];
  for (const event of events) {
    if (!verifyEvent(event) || seen.has(event.id) || !filter.kinds.includes(event.kind) ||
        (filter.ids && !filter.ids.includes(event.id)) || (filter.authors && !filter.authors.includes(event.pubkey)) ||
        (filter.since !== undefined && event.created_at < filter.since) ||
        (filter.until !== undefined && event.created_at > filter.until)) {
      throw new ReaderError('INVALID_RESPONSE','Relay returned an invalid, duplicate or out-of-scope event.');
    }
    for (const [key, values] of Object.entries(filter)) {
      if (key.startsWith('#') && Array.isArray(values) && !(values as string[]).some(v => tags(event,key.slice(1)).includes(v))) {
        throw new ReaderError('INVALID_RESPONSE','Relay returned an event outside the requested scope.');
      }
    }
    seen.add(event.id);
    eventChannel(event);
  }
  return events;
}
export function publicKey(key: Uint8Array): string { return getPublicKey(key); }
