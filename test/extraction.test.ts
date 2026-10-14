import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { extractAttachment } from '../src/extract.js';

test('bounded text sections/CSV extraction and unsupported formats',async()=>{
  assert.equal((await extractAttachment(strToU8('hello'),'text/plain')).text,'hello');
  const long=await extractAttachment(strToU8('x'.repeat(25000)),'text/plain');assert.equal(long.text?.length,20000);assert.equal(long.truncated,true);
  assert.equal(long.next_offset,20000);assert.equal(long.total_characters,25000);assert.equal(long.extraction_complete,true);
  const csv=await extractAttachment(strToU8('name,value\n"quoted, name",42\n'),'text/csv');assert.match(csv.text??'',/quoted, name\t42/);
  assert.equal((await extractAttachment(strToU8('not supported'),'application/octet-stream')).status,'unsupported');
  assert.equal((await extractAttachment(strToU8('<svg>'),'image/svg+xml')).status,'unsupported');
});

test('generic-labeled transcript sections reconstruct all text without gaps',async()=>{
  const original='BEGIN\n'+('meeting line 🐝\r\n'.repeat(2400))+'\nEND';let output='';let offset=0;
  do{
    const result=await extractAttachment(strToU8(original),'application/octet-stream',{filename:'Monday.txt',offset,length:10000});
    assert.equal(result.status,'extracted');assert.equal(result.format,'text/plain');assert.equal(result.extraction_complete,true);
    assert.equal(result.offset,offset);assert.equal(result.total_characters,original.length);output+=result.text;
    if(result.next_offset===null){assert.equal(result.truncated,false);break;}
    assert.equal(result.next_offset,offset+10000);offset=result.next_offset!;
  }while(offset<original.length);
  assert.equal(output,original);
  const final=await extractAttachment(strToU8(original),'application/octet-stream',{filename:'Monday.txt',offset:original.length});
  assert.equal(final.text,'');assert.equal(final.next_offset,null);
  await assert.rejects(()=>extractAttachment(strToU8('short'),'text/plain',{offset:100}),/beyond/);
  await assert.rejects(()=>extractAttachment(strToU8('short'),'text/plain',{length:20001}),/valid document section/);
});

test('text hints require readable bytes; unknown binary and unsafe images stay unsupported',async()=>{
  for(const filename of ['note.md','captions.vtt','captions.srt','rows.tsv']){
    const result=await extractAttachment(strToU8('Readable text'),'application/octet-stream',{filename});assert.equal(result.text,'Readable text');
  }
  assert.equal((await extractAttachment(strToU8('Readable text'),'application/octet-stream',{declaredType:'text/plain; charset=utf-8'})).text,'Readable text');
  assert.equal((await extractAttachment(new Uint8Array([0,1,2,3]),'application/octet-stream',{filename:'fake.txt'})).status,'unsupported');
  assert.equal((await extractAttachment(new Uint8Array([255,254,1]),'application/octet-stream',{filename:'fake.txt'})).status,'unsupported');
  assert.equal((await extractAttachment(strToU8('<svg/>'),'image/svg+xml',{filename:'fake.txt'})).status,'unsupported');
  assert.equal((await extractAttachment(zipSync({'random.txt':strToU8('not a document')}),'application/octet-stream',{filename:'fake.txt'})).status,'unsupported');
  assert.equal((await extractAttachment(strToU8('broken PDF'),'application/pdf',{filename:'fake.txt'})).status,'unsupported');
});

test('total extraction limits remain explicit after the final available section',async()=>{
  const result=await extractAttachment(strToU8('x'.repeat(1000001)),'text/plain',{offset:990000});
  assert.equal(result.text?.length,10000);assert.equal(result.next_offset,null);
  assert.equal(result.total_characters,1000000);assert.equal(result.extraction_complete,false);assert.equal(result.truncated,true);
});

test('DOCX plain text extraction refuses entities and inflated archives',async()=>{
  const good=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Synthetic Word text</w:t></w:r></w:p></w:body></w:document>')});
  assert.match((await extractAttachment(good,'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).text??'',/Synthetic Word text/);
  assert.match((await extractAttachment(good,'application/octet-stream',{filename:'document.docx'})).text??'',/Synthetic Word text/);
  assert.match((await extractAttachment(good,'text/plain')).text??'',/Synthetic Word text/);
  const bad=zipSync({'word/document.xml':strToU8('<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><document>&x;</document>')});
  assert.equal((await extractAttachment(bad,'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).status,'unsupported');
  const huge=zipSync({'word/document.xml':strToU8('x'.repeat(3*1024*1024))});
  assert.equal((await extractAttachment(huge,'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).status,'unsupported');
  const longText='START'+('word '.repeat(7000))+'END';
  const longDoc=zipSync({'word/document.xml':strToU8(`<document><body><p><r><t>${longText}</t></r></p></body></document>`)});
  const first=await extractAttachment(longDoc,'application/octet-stream');
  const last=await extractAttachment(longDoc,'application/octet-stream',{offset:first.next_offset!});
  assert.equal((first.text??'')+(last.text??''),longText+'\n');assert.equal(last.next_offset,null);assert.equal(last.extraction_complete,true);
});

test('XLSX returns raw stored values and does not evaluate formulas',async()=>{
  const xlsx=zipSync({'xl/sharedStrings.xml':strToU8('<sst><si><t>Synthetic sheet</t></si></sst>'),
    'xl/worksheets/sheet1.xml':strToU8('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><f>HYPERLINK("https://example.com")</f><v>7</v></c></row></sheetData></worksheet>')});
  const result=await extractAttachment(xlsx,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.match(result.text??'',/A1=Synthetic sheet/);assert.match(result.text??'',/B1=7/);assert.doesNotMatch(result.text??'',/HYPERLINK/);
  assert.match((await extractAttachment(xlsx,'application/octet-stream')).text??'',/A1=Synthetic sheet/);
});

test('PDF extracts text from a synthetic fixture; malformed input fails safely',async()=>{
  // Minimal self-contained PDF with byte-accurate xref offsets.
  const stream='BT /F1 12 Tf 40 100 Td (Synthetic PDF text) Tj ET';
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${body}\nendobj\n`;});
  const start=Buffer.byteLength(pdf);pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  const result=await extractAttachment(strToU8(pdf),'application/pdf');assert.match(result.text??'',/Synthetic PDF text/);
  assert.equal((await extractAttachment(strToU8('invalid PDF'),'application/pdf')).status,'unsupported');
});

function multipagePdf(pages:number,blank=false):Uint8Array{
  const objects=['<< /Type /Catalog /Pages 2 0 R >>','', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'];const kids:number[]=[];
  for(let page=1;page<=pages;page++){
    const id=objects.length+1;kids.push(id);const stream=blank?'':`BT /F1 12 Tf 40 100 Td (Page-${page}-marker) Tj ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id+1} 0 R >>`,
      `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  }
  objects[1]=`<< /Type /Pages /Kids [${kids.map(k=>`${k} 0 R`).join(' ')}] /Count ${pages} >>`;
  let pdf='%PDF-1.4\n';const offsets=[0];objects.forEach((body,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${body}\nendobj\n`;});
  const start=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(o=>String(o).padStart(10,'0')+' 00000 n ').join('\n')}\ntrailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return strToU8(pdf);
}

test('PDF recognition and sections include pages beyond twenty; page caps are explicit',async()=>{
  const bytes=multipagePdf(24);let output='';let offset=0;
  do{
    const result=await extractAttachment(bytes,'application/octet-stream',{filename:'wrong.txt',offset,length:100});
    assert.equal(result.format,'application/pdf');assert.equal(result.extraction_complete,true);output+=result.text;
    if(result.next_offset===null)break;offset=result.next_offset!;
  }while(offset<10000);
  for(const page of [1,12,24])assert.match(output,new RegExp(`Page-${page}-marker`));
  const capped=await extractAttachment(multipagePdf(201),'application/pdf');
  assert.equal(capped.extraction_complete,false);assert.equal(capped.truncated,true);assert.match(capped.text??'',/Page-200-marker/);assert.doesNotMatch(capped.text??'',/Page-201-marker/);
  const blank=await extractAttachment(multipagePdf(1,true),'application/pdf');assert.equal(blank.status,'unsupported');assert.match(blank.reason??'',/No readable text/);
});
