import { fork } from 'node:child_process';
import { ReaderError } from './errors.js';
export type Extraction = {status:string;format:string;text?:string;truncated?:boolean;reason?:string;base64?:string;mime?:string};
export async function extractAttachment(bytes:Uint8Array,type:string):Promise<Extraction> {
  if(bytes.length>10*1024*1024) throw new ReaderError('SIZE_LIMIT','Attachment exceeds the extraction limit.');
  // A process boundary protects the MCP process even if a native dependency exhausts the parser heap.
  const compiled=import.meta.url.endsWith('.js');
  const worker=fork(new URL(compiled?'./extract-worker.js':'../dist/extract-worker.js',import.meta.url),[],{
    execArgv:['--max-old-space-size=256'],env:{},stdio:['ignore','ignore','ignore','ipc'],serialization:'advanced'
  });
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(error:ReaderError|null,value?:Extraction)=>{
      if(settled)return;settled=true;clearTimeout(timer);worker.kill();
      if(error)reject(error);else resolve(value!);
    };
    const timer=setTimeout(()=>finish(new ReaderError('EXTRACTION_TIMEOUT','Attachment parsing exceeded the time limit.')),15000);
    worker.once('message',(value:Extraction)=>finish(null,value));
    worker.once('error',()=>finish(new ReaderError('EXTRACTION_FAILED','Attachment parser failed; no parser diagnostics or content were logged.')));
    worker.once('exit',()=>{if(!settled)finish(new ReaderError('EXTRACTION_FAILED','Attachment parser exited before producing a result.'));});
    worker.send({bytes,type});
  });
}
