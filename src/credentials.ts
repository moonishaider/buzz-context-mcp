import { AsyncEntry } from '@napi-rs/keyring';
import { hash, publicKey } from './protocol.js';
import { ReaderError } from './errors.js';
import type { Profile } from './config.js';

const SERVICE='buzz-context-mcp.v1';
function entry(name:string,profile:Profile):AsyncEntry{
  try{return new AsyncEntry(SERVICE,hash(`${name}\0${profile.relay}\0${profile.pubkey}`),{linux:{store:'secret-service'}});}
  catch{throw new ReaderError('SECURE_STORE_UNAVAILABLE','OS credential store unavailable. Linux requires an unlocked Secret Service; plaintext fallback is disabled.');}
}
export async function loadKey(name:string,profile:Profile):Promise<Uint8Array>{
  let values:number[]|null;
  try{values=await entry(name,profile).getSecret();}
  catch{throw new ReaderError('SECURE_STORE_UNAVAILABLE','Cannot read the connector credential. Unlock the OS credential store and retry.');}
  if(!values)throw new ReaderError('NOT_PROVISIONED','No connector credential exists for this profile.');
  const key=Uint8Array.from(values);values.fill(0);
  try{if(key.length!==32||publicKey(key)!==profile.pubkey)throw new Error();}
  catch{key.fill(0);throw new ReaderError('IDENTITY_MISMATCH','Stored credential does not match the configured public identity.');}
  return key;
}
export async function storeKey(name:string,profile:Profile,key:Uint8Array):Promise<void>{
  if(key.length!==32||publicKey(key)!==profile.pubkey)throw new ReaderError('IDENTITY_MISMATCH','The supplied key does not match the expected public identity.');
  try{
    const e=entry(name,profile);await e.setSecret(key);const check=await e.getSecret();
    if(!check||check.length!==32||publicKey(Uint8Array.from(check))!==profile.pubkey){check?.fill(0);await e.deleteCredential();throw new Error();}
    check.fill(0);
  }catch{throw new ReaderError('SECURE_STORE_UNAVAILABLE','Secure credential storage or verification failed. No plaintext fallback is used.');}
}
export async function deleteKey(name:string,profile:Profile):Promise<void>{
  try{await entry(name,profile).deleteCredential();}
  catch{throw new ReaderError('SECURE_STORE_UNAVAILABLE','Credential deletion failed. Unlock the OS credential store and retry.');}
}
