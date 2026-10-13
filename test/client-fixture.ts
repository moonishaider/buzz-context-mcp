// Synthetic-only stdio endpoint for real-client conformance checks. Never shipped in the package.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { BuzzClient } from '../src/client.js';
import { BuzzReader } from '../src/reader.js';
import { createServer } from '../src/server.js';
import { fixture } from './fixture.js';
const f=await fixture();
const client=new BuzzClient(f.origin,f.alice,{testLoopback:true});
const server=createServer(new BuzzReader(client));
let stopped=false;
const stop=async()=>{if(stopped)return;stopped=true;client.dispose();await f.close();};
server.server.onclose=()=>{void stop();};
process.once('SIGTERM',()=>{void server.close().then(stop);});
process.once('SIGINT',()=>{void server.close().then(stop);});
await server.connect(new StdioServerTransport());
