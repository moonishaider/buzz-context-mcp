import test from 'node:test';
import assert from 'node:assert/strict';
import { bech32 } from '@scure/base';
import { generateSecretKey } from 'nostr-tools/pure';
import { nsecEncode } from 'nostr-tools/nip19';
import { encrypt } from 'nostr-tools/nip49';
import { decodeSecret } from '../src/secret-input.js';
test('secret input accepts owned raw/nsec keys and rejects malicious encrypted-backup costs before decrypting',()=>{
  const key=generateSecretKey();
  try{assert.deepEqual(decodeSecret(Buffer.from(key).toString('hex')),key);assert.deepEqual(decodeSecret(nsecEncode(key)),key);
    const payload=new Uint8Array(91);payload[0]=2;payload[1]=30;
    const hostile=bech32.encode('ncryptsec',bech32.toWords(payload),1024);assert.throws(()=>decodeSecret(hostile,'not-a-real-password'),/Higher-cost backups/);
    const backup=encrypt(key,'synthetic-pässword',14);assert.deepEqual(decodeSecret(backup,'synthetic-pässword'),key);
    assert.throws(()=>decodeSecret(backup,'wrong synthetic password'),/could not be unlocked/);
    assert.throws(()=>decodeSecret('nsec-invalid'),/could not be decoded/);
  }finally{key.fill(0);}
});
