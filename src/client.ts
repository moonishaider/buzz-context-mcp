import { ReaderError } from './errors.js';
import { requestTimeout } from './budget.js';
import { authHeader, checkedEvents, hash, mediaAuthHeader, normalizeRelay, publicKey, validateFilter, type Filter } from './protocol.js';

export async function boundedBody(response: Response, maximum: number): Promise<Uint8Array> {
  const stated = Number(response.headers.get('content-length'));
  if (stated > maximum) { await response.body?.cancel(); throw new ReaderError('SIZE_LIMIT','Response exceeds the download limit.'); }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.length;
      if (size > maximum) throw new ReaderError('SIZE_LIMIT','Response exceeds the download limit.');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(()=>{}); }
  const output = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { output.set(chunk,offset); offset += chunk.length; }
  return output;
}

export class BuzzClient {
  readonly relay: string;
  readonly pubkey: string;
  #key: Uint8Array;
  #disposed = false;
  constructor(relay: string, key: Uint8Array, options: { testLoopback?: boolean } = {}) {
    this.relay = normalizeRelay(relay, options.testLoopback);
    this.#key = key.slice(); this.pubkey = publicKey(this.#key);
  }
  dispose(): void { this.#key.fill(0); this.#disposed = true; }
  #active(): void { if(this.#disposed) throw new ReaderError('DISCONNECTED','The reader is disconnected.'); }
  async #request(url: string, init: RequestInit, maxBytes: number): Promise<{bytes:Uint8Array;type:string}> {
    this.#active();
    if (new URL(url).origin !== this.relay) throw new ReaderError('ORIGIN_DENIED','Cross-origin requests are not permitted.');
    let response: Response;
    const timeout=requestTimeout();
    try { response = await fetch(url,{...init, redirect:'error',signal:AbortSignal.timeout(timeout)}); }
    catch { throw new ReaderError('NETWORK_ERROR','Relay request failed or timed out. Check relay URL, network and TLS.'); }
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403) throw new ReaderError('ACCESS_DENIED','Relay denied access. Check identity, membership and any enterprise authentication requirements.');
      if (response.status === 429) throw new ReaderError('RATE_LIMITED','Relay rate limit reached. Retry later.');
      throw new ReaderError('RELAY_ERROR',`Relay returned HTTP ${response.status}; response body was withheld.`);
    }
    try { return {bytes:await boundedBody(response,maxBytes),type:(response.headers.get('content-type')??'').split(';')[0]!.toLowerCase()}; }
    catch(e) { if(e instanceof ReaderError) throw e; throw new ReaderError('NETWORK_ERROR','Response download failed.'); }
  }
  async query(filter: Filter) {
    this.#active(); validateFilter(filter);
    const body = JSON.stringify([filter]); const url = `${this.relay}/query`;
    const {bytes} = await this.#request(url,{method:'POST',headers:{'Content-Type':'application/json',Authorization:authHeader(this.#key,url,body)},body},8*1024*1024);
    let data: unknown; try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ReaderError('INVALID_RESPONSE','Relay returned invalid JSON.'); }
    return checkedEvents(data,filter);
  }
  async discovery(): Promise<unknown> {
    const {bytes} = await this.#request(this.relay+'/',{method:'GET',headers:{Accept:'application/nostr+json'}},65536);
    let data: unknown; try { data = JSON.parse(new TextDecoder().decode(bytes)); } catch { throw new ReaderError('UNSUPPORTED_RELAY','Relay did not return a NIP-11 capability document.'); }
    // Presence does not prove enforcement, but refusing unsupported advertised enterprise mode is safer than guessing.
    if (data && typeof data === 'object' && 'federated_identity' in data) throw new ReaderError('UNSUPPORTED_AUTH','This relay advertises federated identity; v1 does not support its enterprise assertion flow.');
    return data;
  }
  async media(url: string, expectedHash: string): Promise<{bytes:Uint8Array;type:string}> {
    this.#active();
    const u = new URL(url);
    if (u.origin !== this.relay || u.username || u.password || u.search || u.hash ||
        !/^\/media\/[a-f0-9]{64}(\.[a-z0-9]{1,8})?$/.test(u.pathname) || !u.pathname.startsWith(`/media/${expectedHash}`)) {
      throw new ReaderError('ATTACHMENT_DENIED','Only parent-verified relay attachments with a hash may be downloaded.');
    }
    const result = await this.#request(u.href,{method:'GET',headers:{Authorization:mediaAuthHeader(this.#key,u.href,expectedHash)}},10*1024*1024);
    if(hash(result.bytes) !== expectedHash) throw new ReaderError('HASH_MISMATCH','Attachment hash verification failed.');
    return result;
  }
}
