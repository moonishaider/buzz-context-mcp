import { readFile,writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Run through npm run prepare-local. No shell, credential input or client changes.
const root=fileURLToPath(new URL('../',import.meta.url));
function run(command,args,capture=false){
  const result=spawnSync(command,args,{cwd:root,stdio:capture?'pipe':'inherit',encoding:'utf8',shell:false});
  if(result.error||result.status!==0)throw new Error('Local preparation failed. Inspect the preceding diagnostics; existing client registrations were not changed.');
  return capture?result.stdout.trim():'';
}
try{
  const [major,minor]=process.versions.node.split('.').map(Number);
  if(major!==24||minor<14)throw new Error('Use Node 24.14+ within Node 24. An assistant can prepare an isolated runtime.');
  const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8'));
  const supported=JSON.parse(await readFile(join(root,'SUPPORTED_VERSION.json'),'utf8'));
  if(pkg.version!==supported.version)throw new Error('Version metadata disagrees. Stop and ask the maintainer.');
  const commit=run('git',['rev-parse','HEAD'],true);
  if(run('git',['status','--porcelain'],true))throw new Error('Use a clean checkout for installation; preserve existing work.');
  const npm=process.env.npm_execpath;
  if(!npm)throw new Error('Run this through npm run prepare-local.');
  run(process.execPath,[npm,'ci','--ignore-scripts']);
  run(process.execPath,[npm,'run','check']);
  if(run('git',['rev-parse','HEAD'],true)!==commit||run('git',['status','--porcelain'],true))throw new Error('Checkout changed during preparation. Stop and inspect it.');
  const record={version:pkg.version,commit,node:process.version,platform:process.platform,preparedAt:new Date().toISOString()};
  await writeFile(join(root,'.installation.json'),JSON.stringify(record,null,2)+'\n',{mode:0o600});
  console.log(JSON.stringify({prepared:true,...record,next:'Offer browser or Terminal setup. See docs/SETUP.md. No credential or MCP registration was changed.'}));
}catch(error){console.error(error instanceof Error?error.message:'Preparation failed.');process.exitCode=1;}
