import { bech32 } from '@scure/base';
import { nip19 } from 'nostr-tools';
import { decrypt } from 'nostr-tools/nip49';
import { hex } from './protocol.js';
import { ReaderError } from './errors.js';
export function decodeSecret(secret:string,password?:string):Uint8Array{
  if(secret.startsWith('ncryptsec')){
    let data:Uint8Array;
    try{const decoded=bech32.decode(secret as `${string}1${string}`,1024);if(decoded.prefix!=='ncryptsec')throw new Error();data=bech32.fromWords(decoded.words);}
    catch{throw new ReaderError('INVALID_KEY','Encrypted backup encoding is invalid.');}
    if(data.length!==91||data[0]!==2||data[1]===undefined||data[1]>16||data[1]<14)throw new ReaderError('BACKUP_COST_LIMIT','Supported encrypted backups use NIP-49 v2 with logN 14–16. Higher-cost backups are refused to protect local resources; use your own nsec through the hidden local prompt.');
    if(password===undefined)throw new ReaderError('PASSWORD_REQUIRED','Encrypted backup requires a hidden local password.');
    try{return decrypt(secret,password);}catch{throw new ReaderError('INVALID_KEY','Encrypted backup could not be unlocked.');}
  }
  try{
    if(secret.startsWith('nsec')){const decoded=nip19.decode(secret);if(decoded.type!=='nsec')throw new Error();return decoded.data;}
    hex.parse(secret);return Uint8Array.from(Buffer.from(secret,'hex'));
  }catch{throw new ReaderError('INVALID_KEY','Key could not be decoded.');}
}
