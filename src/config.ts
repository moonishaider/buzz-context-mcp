import { mkdir, readFile, rename, writeFile, lstat, open, unlink } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { hex, normalizeRelay } from './protocol.js';
import { ReaderError } from './errors.js';

export const profileName=z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/);
const profileSchema=z.object({relay:z.string(),pubkey:hex,disabled:z.boolean().optional()}).strict();
const configSchema=z.object({version:z.literal(1),profiles:z.record(profileSchema)}).strict();
export type Profile=z.infer<typeof profileSchema>;
export function configDirectory():string {
  return process.env.BUZZ_CONTEXT_CONFIG_DIR??(process.platform==='win32'?join(process.env.APPDATA??join(homedir(),'AppData','Roaming'),'buzz-context-mcp'):join(homedir(),'.config','buzz-context-mcp'));
}
export async function withConfigLock<T>(operation:()=>Promise<T>,directory=configDirectory()):Promise<T>{
  await mkdir(directory,{recursive:true,mode:0o700});
  const stat=await lstat(directory);if(!stat.isDirectory()||stat.isSymbolicLink())throw new ReaderError('CONFIG_ERROR','Configuration directory must not be a symlink.');
  const path=join(directory,'provisioning.lock');
  let handle;
  try{handle=await open(path,'wx',0o600);}catch{throw new ReaderError('CONFIG_BUSY','Another provisioning/disconnect operation owns the local lock. If interrupted, inspect and remove only this connector lock after confirming no setup is running.');}
  try{return await operation();}finally{await handle.close();await unlink(path);}
}
export async function readConfig(directory=configDirectory()):Promise<z.infer<typeof configSchema>> {
  const path=join(directory,'profiles.json');let data:string;
  try{
    const stat=await lstat(path);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.size>65536)throw new ReaderError('CONFIG_ERROR','Invalid profile configuration file.');
    data=await readFile(path,'utf8');
  }catch(e){if(e&&typeof e==='object'&&'code' in e&&e.code==='ENOENT')return {version:1,profiles:{}};throw new ReaderError('CONFIG_ERROR','Cannot safely read profile configuration.');}
  let parsed:z.infer<typeof configSchema>;
  try{parsed=configSchema.parse(JSON.parse(data));for(const [name,p] of Object.entries(parsed.profiles)){profileName.parse(name);normalizeRelay(p.relay);}}
  catch{throw new ReaderError('CONFIG_ERROR','Profile configuration is malformed.');}
  return parsed;
}
export async function getProfile(name:string,directory=configDirectory(),allowDisabled=false):Promise<Profile>{
  profileName.parse(name);const config=await readConfig(directory);const profile=Object.hasOwn(config.profiles,name)?config.profiles[name]:undefined;
  if(!profile)throw new ReaderError('NOT_CONFIGURED','Profile not configured. Complete human-controlled local provisioning first.');
  if(profile.disabled&&!allowDisabled)throw new ReaderError('DISCONNECTED','Profile is disabled. Finish disconnect cleanup before reprovisioning.');
  return profile;
}
export async function saveProfile(name:string,profile:Profile|null,directory=configDirectory()):Promise<void>{
  profileName.parse(name);const config=await readConfig(directory);
  if(profile){profileSchema.parse(profile);normalizeRelay(profile.relay);config.profiles[name]=profile;}else delete config.profiles[name];
  await mkdir(directory,{recursive:true,mode:0o700});
  const stat=await lstat(directory);
  if(!stat.isDirectory()||stat.isSymbolicLink())throw new ReaderError('CONFIG_ERROR','Configuration directory must not be a symlink.');
  const tmp=join(directory,`profiles.${randomUUID()}.tmp`);
  await writeFile(tmp,JSON.stringify(config,null,2)+'\n',{flag:'wx',mode:0o600});
  await rename(tmp,join(directory,'profiles.json'));
}
