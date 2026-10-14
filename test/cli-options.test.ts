import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('CLI offers both methods, refuses unknown methods and never accepts piped Terminal secrets',()=>{
  const cli=fileURLToPath(new URL('../dist/cli.js',import.meta.url));
  const run=(args:string[],input='')=>spawnSync(process.execPath,[cli,...args],{input,encoding:'utf8',env:{PATH:process.env.PATH}});
  const help=run(['--help']);assert.equal(help.status,0);assert.match(help.stdout,/browser\|terminal/);assert.match(help.stdout,/by default/);
  const invalid=run(['configure','--method','chat']);assert.equal(invalid.status,1);assert.match(invalid.stderr,/Choose --method/);
  const piped=run(['configure','--method','terminal','--relay','https://fixture.example','--pubkey','a'.repeat(64)],'synthetic-secret-must-not-appear');
  assert.equal(piped.status,1);assert.match(piped.stderr,/HUMAN_REQUIRED/);assert.doesNotMatch(piped.stdout+piped.stderr,/synthetic-secret-must-not-appear/);
});
