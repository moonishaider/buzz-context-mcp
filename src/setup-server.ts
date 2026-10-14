import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { spawn } from 'node:child_process';
import { z } from 'zod';
import { ReaderError } from './errors.js';
import { setupPage } from './setup-page.js';
import type { ProvisionInput } from './provision.js';

const schema=z.object({relay:z.string().max(2048),pubkey:z.string().regex(/^[a-f0-9]{64}$/),secret:z.string().min(1).max(1024),password:z.string().max(1024).optional(),consent:z.literal(true)}).strict();
type SetupResult={configured?:boolean;cancelled?:boolean;expired?:boolean;failed?:boolean};
export async function startSetupServer(options:{profile:string;relay?:string;pubkey?:string;ttlMs?:number;configure:(input:ProvisionInput,active:()=>boolean)=>Promise<unknown>}){
  const token=randomBytes(32).toString('hex');const nonce=randomBytes(24).toString('base64');
  let origin='',used=false,closed=false;const deadline=Date.now()+(options.ttlMs??300000);
  let finish!:(result:SetupResult)=>void;
  const done=new Promise<SetupResult>(resolve=>{finish=resolve;});
  const server=createServer({maxHeaderSize:8192,requestTimeout:10000,headersTimeout:10000},(req,res)=>{void handle(req,res).catch(()=>{if(!res.headersSent)respond(res,400,{message:'Invalid setup request.'});else res.destroy();});});
  server.maxConnections=8;server.maxRequestsPerSocket=4;server.setTimeout(65000,socket=>socket.destroy());
  const stop=(result:SetupResult)=>{if(closed)return;closed=true;clearTimeout(timer);server.close();server.closeAllConnections();finish(result);};
  const timer=setTimeout(()=>stop({expired:true}),Math.max(1,deadline-Date.now()));
  function respond(res:ServerResponse,status:number,body:unknown){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body));}
  async function handle(req:IncomingMessage,res:ServerResponse){
    res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');res.setHeader('Connection','close');
    res.setHeader('Content-Security-Policy',`default-src 'none'; script-src 'nonce-${nonce}'; style-src 'nonce-${nonce}'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`);
    if(req.socket.remoteAddress!=='127.0.0.1'||req.headers.host!==new URL(origin).host||req.headers['sec-fetch-site']==='cross-site')return respond(res,403,{message:'Setup request refused.'});
    if(closed||used||Date.now()>=deadline)return respond(res,410,{message:'Setup session is no longer available.'});
    if(req.method==='GET'&&req.url==='/'){
      if(req.headers.origin&&req.headers.origin!==origin)return respond(res,403,{message:'Setup request refused.'});
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8'});res.end(setupPage(nonce,options.profile,options.relay,options.pubkey));return;
    }
    if(req.method!=='POST'||(req.url!=='/configure'&&req.url!=='/cancel'))return respond(res,404,{message:'Not found.'});
    const auth=req.headers.authorization??'';const expected=`Bearer ${token}`;
    if(req.headers.origin!==origin||req.headers['content-type']!=='application/json'||auth.length!==expected.length||!timingSafeEqual(Buffer.from(auth),Buffer.from(expected)))return respond(res,403,{message:'Setup request refused.'});
    const chunks:Buffer[]=[];let length=0;let raw='';let input:ProvisionInput|undefined;
    try{
      for await(const chunk of req){length+=chunk.length;if(length>8192){respond(res,413,{message:'Setup input is too large.'});return;}chunks.push(chunk);}
      if(closed||used||Date.now()>=deadline)return respond(res,410,{message:'Setup session is no longer available.'});
      const combined=Buffer.concat(chunks);try{raw=combined.toString('utf8');}finally{combined.fill(0);}
      if(req.url==='/cancel'){
        if(raw!=='{}')return respond(res,400,{message:'Invalid cancellation.'});
        used=true;res.once('finish',()=>stop({cancelled:true}));respond(res,200,{cancelled:true});return;
      }
      const parsed=schema.safeParse(JSON.parse(raw));if(!parsed.success)return respond(res,400,{message:'Check the form fields and consent.'});
      input=parsed.data;used=true;
      let result:SetupResult;
      try{await options.configure(input,()=>!closed&&Date.now()<deadline);result={configured:true};}
      catch(error){result={failed:true};const message=error instanceof ReaderError?error.message:'Setup failed. Check your details and secure store, then restart setup.';
        res.once('finish',()=>stop(result));respond(res,400,{message});return;}
      res.once('finish',()=>stop(result));respond(res,200,result);
    }finally{raw='';for(const chunk of chunks)chunk.fill(0);if(input){input.secret='';input.password='';}}
  }
  try{await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});}
  catch(error){clearTimeout(timer);throw error;}
  const address=server.address();if(!address||typeof address==='string')throw new Error('Local setup failed to bind.');
  origin=`http://127.0.0.1:${address.port}`;
  return {url:`${origin}/#${token}`,done,close:()=>stop({cancelled:true})};
}
export function openSetupBrowser(url:string):Promise<void>{
  // Separate argv; never invoke a shell or accept a caller-selected executable.
  const command=process.platform==='darwin'?'open':process.platform==='win32'?'explorer.exe':'xdg-open';
  return new Promise((resolve,reject)=>{const child=spawn(command,[url],{stdio:'ignore',windowsHide:true});child.unref();child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error('Browser did not open. Use the setup link.')));});
}
