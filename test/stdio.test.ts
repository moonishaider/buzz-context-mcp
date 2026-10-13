import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { A,B } from './fixture.js';

test('real subprocess STDIO initialize/list/read/deny workflow',async t=>{
  const transport=new StdioClientTransport({command:process.execPath,args:['--import','tsx',fileURLToPath(new URL('./client-fixture.ts',import.meta.url))],stderr:'pipe'});
  transport.stderr?.resume();const client=new Client({name:'stdio-synthetic-test',version:'1.0.0'});
  await client.connect(transport);t.after(()=>client.close());
  assert.equal((await client.listTools()).tools.length,13);
  const a=await client.callTool({name:'read_channel_history',arguments:{channel_id:A}});assert.match(JSON.stringify(a),/alice-only-marker/);
  const b=await client.callTool({name:'read_channel_history',arguments:{channel_id:B}});assert.equal(b.isError,true);assert.doesNotMatch(JSON.stringify(b),/bob-only-marker/);
});
