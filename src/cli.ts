#!/usr/bin/env node
import { parseArgs } from 'node:util';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StringDecoder } from 'node:string_decoder';
import { provision } from './provision.js';
import { startSetupServer, openSetupBrowser } from './setup-server.js';
import { BuzzClient } from './client.js';
import { BuzzReader } from './reader.js';
import { createServer } from './server.js';
import { getProfile, profileName, saveProfile, withConfigLock } from './config.js';
import { deleteKey, loadKey } from './credentials.js';
import { ReaderError, safeError } from './errors.js';
import { hex, normalizeRelay } from './protocol.js';

export async function hiddenInput(prompt:string):Promise<string>{
  if(!process.stdin.isTTY||!process.stderr.isTTY)throw new ReaderError('HUMAN_REQUIRED','Provisioning requires a human-controlled interactive terminal. Secrets via pipes or arguments are refused.');
  process.stderr.write(prompt);const input=process.stdin;const raw=input.isRaw;input.setRawMode(true);input.resume();
  return new Promise((resolve,reject)=>{
    let value='';const decoder=new StringDecoder('utf8');let escape=false;
    const cleanup=()=>{input.off('data',onData);input.setRawMode(raw);input.pause();process.stderr.write('\n');};
    const onData=(chunk:Buffer)=>{
      for(const char of decoder.write(chunk)){
        if(char==='\x03'){cleanup();reject(new ReaderError('CANCELLED','Provisioning cancelled.'));return;}
        if(char==='\r'||char==='\n'){cleanup();resolve(value);return;}
        if(char==='\x7f'||char==='\b'){value=value.slice(0,-1);continue;}
        if(char==='\x1b'){escape=true;continue;}
        if(escape){if(/[A-Za-z~]/.test(char))escape=false;continue;}
        if(!/\p{C}/u.test(char))value+=char;
        if(value.length>1024){cleanup();reject(new ReaderError('INVALID_INPUT','Input too long.'));return;}
      }
    };input.on('data',onData);
  });
}
async function main(){
  if(Number(process.versions.node.split('.')[0])!==24||Number(process.versions.node.split('.')[1])<14)throw new ReaderError('RUNTIME_REQUIRED','Use Node.js 24.14 or newer within the Node 24 release line.');
  const {values,positionals}=parseArgs({allowPositionals:true,options:{profile:{type:'string',default:'default'},relay:{type:'string'},pubkey:{type:'string'},method:{type:'string',default:'browser'},help:{type:'boolean'}}});
  const command=values.help?'help':positionals[0]??'help';const name=profileName.parse(values.profile);
  if(command==='help'){
    console.log('Buzz Context MCP (private alpha)\nCommands: configure, serve, status, doctor, disconnect\nOptions: --profile NAME, --relay HTTPS_ORIGIN, --pubkey EXPECTED_HEX, --method browser|terminal\nconfigure opens a local browser form by default; --method terminal uses hidden human TTY input. Both store the key only in the connector OS credential entry.\nNever provide a secret key as an argument, environment variable or chat message.');return;
  }
  if(command==='configure'){
    if(values.method!=='browser'&&values.method!=='terminal')throw new ReaderError('INVALID_INPUT','Choose --method browser or --method terminal.');
    if(values.method==='browser'){
      const relay=values.relay?normalizeRelay(values.relay):undefined;const pubkey=values.pubkey?hex.parse(values.pubkey):undefined;
      const session=await startSetupServer({profile:name,relay,pubkey,configure:(input,active)=>provision(name,input,active)});
      const cancel=()=>session.close();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
      process.stderr.write(`Local setup link (expires in five minutes; do not share): ${session.url}\n`);
      // Do not block session expiry on a desktop opener that never exits.
      void openSetupBrowser(session.url).catch(()=>process.stderr.write('Open the local setup link in your own browser to continue.\n'));
      try{const result=await session.done;console.log(JSON.stringify({profile:name,...result}));if(!result.configured)process.exitCode=1;}
      finally{process.off('SIGINT',cancel);process.off('SIGTERM',cancel);session.close();}
      return;
    }
    const relay=normalizeRelay(values.relay??'');const pubkey=hex.parse(values.pubkey);
    process.stderr.write('This local reader uses your identity key, which can authorize more than reading. It is not a revocable read-only token.\nOnly proceed after reviewing SECURITY.md. Never paste the key into a model conversation.\n');
    if(await hiddenInput('Type LOCAL-READ to authorize local key custody: ')!=='LOCAL-READ')throw new ReaderError('CANCELLED','Provisioning not authorized.');
    let secret=await hiddenInput('Your own nsec/hex key or encrypted ncryptsec backup (hidden): ');let password='';
    try{
      if(secret.startsWith('ncryptsec'))password=await hiddenInput('Backup password (hidden): ');
      console.log(JSON.stringify(await provision(name,{relay,pubkey,secret,password,consent:true})));
    }finally{secret='';password='';}
    return;
  }

  const profile=await getProfile(name,undefined,command==='disconnect');
  if(command==='status'){console.log(JSON.stringify({profile:name,...profile,notice:'Configuration exists; live authentication has not been checked by this command.'}));return;}
  if(command==='disconnect'){
    return withConfigLock(async()=>{
    const current=await getProfile(name,undefined,true);
    // Disable access first. If key deletion fails, the disabled public profile retains enough
    // information to retry cleanup without leaving running readers authorized.
    await saveProfile(name,{...current,disabled:true});
    await deleteKey(name,current);await saveProfile(name,null);
    console.log(JSON.stringify({disconnected:true,notice:'Connector credential removed. Running readers stop on their next profile check. An already copied identity key is not revoked.'}));
    });
  }
  if(command!=='doctor'&&command!=='serve')throw new ReaderError('INVALID_COMMAND','Unknown command. Use --help.');
  const key=await loadKey(name,profile);const client=new BuzzClient(profile.relay,key);key.fill(0);
  if(command==='doctor'){
    try{await client.discovery();const channels=await client.query({kinds:[39000],limit:30});console.log(JSON.stringify({authenticated:true,identity:client.pubkey,visible_channel_sample:channels.length,notice:'One discovery/query check does not prove full compatibility or coverage.'}));}
    finally{client.dispose();}return;
  }
  const validate=async()=>{const current=await getProfile(name);if(current.pubkey!==profile.pubkey||current.relay!==profile.relay){client.dispose();throw new ReaderError('DISCONNECTED','Profile changed; restart the reader.');}};
  const server=createServer(new BuzzReader(client),validate);
  const close=async()=>{clearInterval(interval);client.dispose();await server.close();};
  const interval=setInterval(()=>{void validate().catch(()=>{void close();});},2000);interval.unref();
  process.once('SIGINT',()=>{void close();});process.once('SIGTERM',()=>{void close();});
  server.server.onclose=()=>{clearInterval(interval);client.dispose();};
  await server.connect(new StdioServerTransport());
}
main().catch(error=>{console.error(JSON.stringify(safeError(error)));process.exitCode=1;});
