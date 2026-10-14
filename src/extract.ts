import { fork } from 'node:child_process';
import { ReaderError } from './errors.js';
export type Extraction = {status:string;format:string;text?:string;truncated?:boolean;reason?:string;base64?:string;mime?:string;offset?:number;next_offset?:number|null;total_characters?:number;extraction_complete?:boolean};
export type ExtractionOptions = {filename?:string;declaredType?:string;offset?:number;length?:number};
export async function extractAttachment(bytes:Uint8Array,type:string,options:ExtractionOptions={}):Promise<Extraction> {
  const offset=options.offset??0,length=options.length??20000;
  if(!Number.isInteger(offset)||offset<0||offset>1000000||!Number.isInteger(length)||length<1||length>20000)
    throw new ReaderError('INVALID_INPUT','Choose a valid document section of at most 20,000 characters.');
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
    worker.once('message',(value:Extraction)=>{
      if(typeof value.text!=='string'){
        if(offset!==0)finish(new ReaderError('INVALID_INPUT','This attachment has no readable text sections.'));
        else finish(null,value);
        return;
      }
      const total=value.text.length;
      if(offset>total){finish(new ReaderError('INVALID_INPUT','The requested section starts beyond the available document text.'));return;}
      const end=Math.min(offset+length,total);
      finish(null,{...value,text:value.text.slice(offset,end),offset,next_offset:end<total?end:null,
        total_characters:total,extraction_complete:!value.truncated,truncated:!!value.truncated||end<total});
    });
    worker.once('error',()=>finish(new ReaderError('EXTRACTION_FAILED','Attachment parser failed; no parser diagnostics or content were logged.')));
    worker.once('exit',()=>{if(!settled)finish(new ReaderError('EXTRACTION_FAILED','Attachment parser exited before producing a result.'));});
    worker.send({bytes,type,filename:options.filename?.slice(0,255),declaredType:options.declaredType?.slice(0,255)});
  });
}
