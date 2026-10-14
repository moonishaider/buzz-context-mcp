import { Unzip, UnzipInflate } from 'fflate';
import { XMLParser } from 'fast-xml-parser';
import { parse } from 'csv-parse/sync';
import type { Extraction } from './extract.js';

let bytes:Uint8Array;
let mime:string;
// Bound total extraction separately from each MCP response section.
const MAX_TEXT=1000000;
const MAX_PDF_PAGES=200;
let filename='';
let declaredType='';
let archiveFiles:Map<string,Uint8Array>|undefined;
const clip=(text:string):Extraction=>({status:'extracted',format:mime,text:text.slice(0,MAX_TEXT),truncated:text.length>MAX_TEXT});
function record(value:unknown):Record<string,unknown>{return value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function list(value:unknown):unknown[]{return value===undefined?[]:Array.isArray(value)?value:[value];}
function text(value:unknown):string{
  if(typeof value==='string'||typeof value==='number')return String(value);
  if(Array.isArray(value))return value.map(text).join('');
  const r=record(value);return Object.entries(r).filter(([k])=>!k.startsWith('@_')).map(([,v])=>text(v)).join('');
}
function xml(data:Uint8Array):Record<string,unknown>{
  const s=new TextDecoder('utf-8',{fatal:true}).decode(data);
  if(/<!DOCTYPE|<!ENTITY/i.test(s))throw new Error('Entities unsupported');
  return record(new XMLParser({ignoreAttributes:false,processEntities:false,parseTagValue:false,removeNSPrefix:true}).parse(s));
}
function archive():Map<string,Uint8Array>{
  if(archiveFiles)return archiveFiles;
  const files=new Map<string,Uint8Array>(); let total=0;let count=0;
  const unzip=new Unzip(file=>{
    if(++count>500)throw new Error('Too many archive entries');
    if(!/^(word\/document\.xml|xl\/sharedStrings\.xml|xl\/worksheets\/sheet[0-9]+\.xml)$/.test(file.name))return;
    if(files.has(file.name))throw new Error('Duplicate entry');
    const chunks:Uint8Array[]=[];let size=0;
    file.ondata=(error,chunk,final)=>{
      if(error)throw error;size+=chunk.length;total+=chunk.length;
      if(size>2*1024*1024||total>8*1024*1024)throw new Error('Inflated archive too large');
      chunks.push(chunk);
      if(final){const b=new Uint8Array(size);let at=0;for(const c of chunks){b.set(c,at);at+=c.length;}files.set(file.name,b);}
    };file.start();
  });
  unzip.register(UnzipInflate);
  for(let at=0;at<bytes.length;at+=4096)unzip.push(bytes.subarray(at,at+4096),at+4096>=bytes.length);
  archiveFiles=files;return files;
}
function readableText():string{
  const value=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
  // Reject binary controls even if an untrusted name claims it is a text file.
  if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value))throw new Error('Not plain text');
  return value;
}
function detectedFormat():string{
  const b=Buffer.from(bytes);
  if(b.subarray(0,5).toString()==='%PDF-')return 'application/pdf';
  if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
  if(b[0]===255&&b[1]===216&&b[2]===255)return 'image/jpeg';
  if(/^GIF8[79]a$/.test(b.subarray(0,6).toString()))return 'image/gif';
  if(b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP')return 'image/webp';
  if(b[0]===80&&b[1]===75){
    const files=archive(),word=files.has('word/document.xml'),sheet=[...files.keys()].some(k=>k.startsWith('xl/worksheets/'));
    if(word&&!sheet)return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if(sheet&&!word)return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    throw new Error('Unsupported archive');
  }
  // Known binary declarations without matching signatures must not become text.
  const types=[mime,declaredType].map(t=>t.split(';')[0]!.trim().toLowerCase());
  if(types.some(t=>t.startsWith('image/')||t==='application/pdf'||t.includes('officedocument')))return mime;
  const hint=filename.toLowerCase().match(/\.(txt|md|markdown|csv|tsv|vtt|srt)$/)?.[1];
  if(types.includes('text/csv')||hint==='csv')return 'text/csv';
  if(types.includes('text/markdown')||hint==='md'||hint==='markdown')return 'text/markdown';
  if(types.some(t=>['text/plain','text/vtt','application/x-subrip','text/tab-separated-values'].includes(t))||hint)return 'text/plain';
  return mime;
}
async function extract():Promise<Extraction>{
  mime=detectedFormat();
  if(mime==='text/plain'||mime==='text/markdown') return clip(readableText());
  if(mime==='text/csv') {
    const rows=parse(readableText(),{to:100,relax_column_count:true,max_record_size:100000}) as unknown[][];
    return {...clip(rows.map(row=>row.slice(0,30).map(v=>String(v)).join('\t')).join('\n')),truncated:true,reason:'At most 100 rows and 30 columns; formulas are not evaluated.'};
  }
  if(mime.startsWith('image/')){
    const b=Buffer.from(bytes);
    const valid=(mime==='image/png'&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))||
      (mime==='image/jpeg'&&b[0]===255&&b[1]===216&&b[2]===255)||
      (mime==='image/gif'&&/^GIF8[79]a$/.test(b.subarray(0,6).toString()))||
      (mime==='image/webp'&&b.subarray(0,4).toString()==='RIFF'&&b.subarray(8,12).toString()==='WEBP');
    if(!valid||bytes.length>2*1024*1024)return {status:'unsupported',format:mime,reason:'Unsupported signature or image exceeds 2 MiB inline limit.'};
    return {status:'image',format:mime,mime,base64:b.toString('base64')};
  }
  if(mime==='application/pdf'){
    if(Buffer.from(bytes.subarray(0,5)).toString()!=='%PDF-')throw new Error('Bad PDF signature');
    const {getDocument}=await import('pdfjs-dist/legacy/build/pdf.mjs');
    const task=getDocument({data:bytes,disableFontFace:true,useSystemFonts:false,stopAtErrors:true});
    try{
      const doc=await task.promise;let output='';let pagesRead=0;const n=Math.min(doc.numPages,MAX_PDF_PAGES);
      for(let p=1;p<=n&&output.length<MAX_TEXT;p++){
        const page=await doc.getPage(p);const content=await page.getTextContent();
        output+=`\n[Page ${p}]\n`+content.items.map(item=>'str' in item?item.str:'').join(' ');page.cleanup();pagesRead=p;
      }
      const result={...clip(output),truncated:pagesRead<doc.numPages||output.length>MAX_TEXT,reason:'Text only; no OCR. At most 200 pages and 1,000,000 characters.'};
      if(!output.replace(/\[Page \d+\]/g,'').trim())return {status:'unsupported',format:mime,reason:'No readable text was found. This PDF may need OCR or contain only blank pages.'};
      return result;
    }finally{await task.destroy();}
  }
  if(mime==='application/vnd.openxmlformats-officedocument.wordprocessingml.document'){
    const file=archive().get('word/document.xml');if(!file)throw new Error('No document XML');
    const doc=record(xml(file).document);const body=record(doc.body);
    return clip(list(body.p).map(text).join('\n')+'\n'+list(body.tbl).map(text).join('\n'));
  }
  if(mime==='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'){
    const files=archive();const shared=files.get('xl/sharedStrings.xml');
    const strings=shared?list(record(xml(shared).sst).si).map(text):[];let output='';let truncated=false;
    const sheets=[...files.entries()].filter(([name])=>name.startsWith('xl/worksheets/')).sort();
    for(const [name,data] of sheets.slice(0,5)){
      output+=`\n[${name}]\n`;const rows=list(record(record(xml(data).worksheet).sheetData).row);
      if(rows.length>100)truncated=true;
      for(const row of rows.slice(0,100)){
        const cells=list(record(row).c);if(cells.length>30)truncated=true;
        output+=cells.slice(0,30).map(cell=>{
          const c=record(cell);const v=text(c.v);return `${String(c['@_r']??'?')}=${c['@_t']==='s'?(strings[Number(v)]??''):c['@_t']==='inlineStr'?text(c.is):v}`;
        }).join('\t')+'\n';
        if(output.length>MAX_TEXT)break;
      }
      if(output.length>MAX_TEXT)break;
    }
    return {...clip(output),truncated:truncated||sheets.length>5||output.length>MAX_TEXT,reason:'Raw stored cell values; formatting and formulas are not evaluated. At most 5 sheets, 100 rows/sheet, 30 cells/row.'};
  }
  return {status:'unsupported',format:mime,reason:'This file format is not supported. Text, PDF, DOCX, CSV, XLSX and supported images can be read.'};
}
process.once('message',input=>{
  const data=input as {bytes:Uint8Array;type:string;filename?:string;declaredType?:string};bytes=data.bytes;mime=data.type;filename=data.filename??'';declaredType=data.declaredType??'';
  void extract().then(value=>process.send?.(value),()=>process.send?.({status:'unsupported',format:mime,reason:'The file could not be read. It may be damaged, encrypted, binary or beyond the supported processing limits.'} satisfies Extraction));
});
