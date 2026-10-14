import { BuzzClient } from './client.js';
import { readConfig, saveProfile, withConfigLock, profileName } from './config.js';
import { deleteKey, storeKey } from './credentials.js';
import { decodeSecret } from './secret-input.js';
import { ReaderError } from './errors.js';
import { hex, normalizeRelay, publicKey } from './protocol.js';

export interface ProvisionInput { relay:string; pubkey:string; secret:string; password?:string; consent:boolean }
export async function provision(name:string,input:ProvisionInput,active:()=>boolean=()=>true){
  profileName.parse(name);
  if(input.consent!==true)throw new ReaderError('CANCELLED','Explicit local key custody consent is required.');
  const profile={relay:normalizeRelay(input.relay),pubkey:hex.parse(input.pubkey)};
  return withConfigLock(async()=>{
    if(Object.hasOwn((await readConfig()).profiles,name))throw new ReaderError('PROFILE_EXISTS','Profile already exists. Disconnect it explicitly before reprovisioning.');
    let key:Uint8Array;
    try{key=decodeSecret(input.secret,input.password);}finally{input.secret='';input.password='';}
    const client=new BuzzClient(profile.relay,key);
    try{
      if(publicKey(key)!==profile.pubkey)throw new ReaderError('IDENTITY_MISMATCH','The supplied key does not match the expected public identity.');
      await client.discovery();await client.query({kinds:[0],authors:[profile.pubkey],limit:1});
      if(!active())throw new ReaderError('CANCELLED','Setup expired or was cancelled. Start setup again.');
      await storeKey(name,profile,key);
      try{
        if(!active())throw new ReaderError('CANCELLED','Setup expired or was cancelled. Start setup again.');
        await saveProfile(name,profile);
      }catch(e){await deleteKey(name,profile);throw e;}
      return {configured:true,profile:name,...profile};
    }finally{key.fill(0);client.dispose();}
  });
}
