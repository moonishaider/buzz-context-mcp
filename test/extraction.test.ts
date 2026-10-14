import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { extractAttachment } from '../src/extract.js';

test('bounded text/CSV extraction and unsupported formats',async()=>{
  assert.equal((await extractAttachment(strToU8('hello'),'text/plain')).text,'hello');
  const long=await extractAttachment(strToU8('x'.repeat(25000)),'text/plain');assert.equal(long.text?.length,20000);assert.equal(long.truncated,true);
  const csv=await extractAttachment(strToU8('name,value\n"quoted, name",42\n'),'text/csv');assert.match(csv.text??'',/quoted, name\t42/);
  assert.equal((await extractAttachment(strToU8('not supported'),'application/octet-stream')).status,'unsupported');
  assert.equal((await extractAttachment(strToU8('<svg>'),'image/svg+xml')).status,'unsupported');
});

test('DOCX plain text extraction refuses entities and inflated archives',async()=>{
  const good=zipSync({'word/document.xml':strToU8('<w:document xmlns:w="x"><w:body><w:p><w:r><w:t>Synthetic Word text</w:t></w:r></w:p></w:body></w:document>')});
  assert.match((await extractAttachment(good,'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).text??'',/Synthetic Word text/);
  const bad=zipSync({'word/document.xml':strToU8('<!DOCTYPE a [<!ENTITY x SYSTEM "file:///etc/passwd">]><document>&x;</document>')});
  assert.equal((await extractAttachment(bad,'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).status,'unsupported');
  const huge=zipSync({'word/document.xml':strToU8('x'.repeat(3*1024*1024))});
  assert.equal((await extractAttachment(huge,'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).status,'unsupported');
});

test('XLSX returns raw stored values and does not evaluate formulas',async()=>{
  const xlsx=zipSync({'xl/sharedStrings.xml':strToU8('<sst><si><t>Synthetic sheet</t></si></sst>'),
    'xl/worksheets/sheet1.xml':strToU8('<worksheet><sheetData><row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1"><f>HYPERLINK("https://example.com")</f><v>7</v></c></row></sheetData></worksheet>')});
  const result=await extractAttachment(xlsx,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  assert.match(result.text??'',/A1=Synthetic sheet/);assert.match(result.text??'',/B1=7/);assert.doesNotMatch(result.text??'',/HYPERLINK/);
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
