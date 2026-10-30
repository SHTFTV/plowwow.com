import assert from 'node:assert/strict';
import { editorialParagraphs,repeatedProse,collectChangedMarkdown } from './lib/content-prose-guard';
const p=(city:string,n:number)=>`${city} has a particular winter article whose meaningful original reporting should not be copied into another place simply by changing the name. This paragraph discusses a distinct local question and contains enough substantive words for comparison, with example ${n} retained consistently in both copies. Several additional details make this a substantial narrative passage rather than a brief common fact.`;
const original=[1,2,3,4].map(n=>p('Abbotsford',n)).join('\n\n');
assert.equal(repeatedProse(original,original.replaceAll('Abbotsford','Aldergrove')).flagged,true,'city-swapped substantive paragraphs must fail');
assert.equal(repeatedProse(original,'A short shared weather fact.\n\n'+original.split('\n\n').map(x=>'*Hero and share artwork: '+x).join('\n\n')).flagged,false,'credits and a short shared fact must not fail');
assert.equal(editorialParagraphs('*Photo credit: '+original).length,3,'only the credit paragraph is excluded, not unrelated following prose');
const calls:string[]=[];
const changed=collectChangedMarkdown(c=>{calls.push(c);if(c==='git rev-parse origin/main'||c==='git rev-parse HEAD')return 'same';if(c.includes('HEAD^...HEAD'))return 'src/content/legacy/blog/committed.md';if(c.includes('diff --name-only HEAD --'))return 'src/content/legacy/blog/unstaged.md\nsrc/content/legacy/blog/staged.md';if(c.includes('ls-files'))return 'src/content/legacy/blog/untracked.md';return '';});
assert.deepEqual(changed.sort(),['committed.md','staged.md','unstaged.md','untracked.md']);
console.log('PASS: copied prose, city substitution, credit/source exclusions and committed/staged/unstaged/untracked scopes');
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
const root=mkdtempSync(join(tmpdir(),'plow-content-regression-'));
try {
 mkdirSync(join(root,'src/content/legacy/blog'),{recursive:true});mkdirSync(join(root,'public/blog-images'),{recursive:true});
 const git=(...args:string[])=>execFileSync('git',args,{cwd:root,stdio:'pipe'}).toString();
 git('init','-q');git('config','user.name','Local regression fixture');git('config','user.email','fixture@example.invalid');
 writeFileSync(join(root,'README.md'),'Fixture only');git('add','.');git('commit','-qm','fixture baseline');
 writeFileSync(join(root,'src/content/legacy/blog/untracked.md'),'# Missing metadata and hero\n\nA deliberately invalid new article.');
 const command=spawnSync(process.execPath,['--import',resolve('node_modules/tsx/dist/loader.mjs'),resolve('scripts/content-change-validate.ts')],{cwd:root,encoding:'utf8'});
 assert.equal(command.status,1,'default mode must fail on actual errors in an untracked article');
 assert.match(command.stderr,/Missing.*header|Missing hero/,'failure must identify real content errors');
 git('add','src/content/legacy/blog/untracked.md');
 assert(collectChangedMarkdown(cmd=>execFileSync('/bin/sh',['-c',cmd],{cwd:root,stdio:'pipe'}).toString()).includes('untracked.md'),'staged additions remain in scope');
 console.log('PASS: real temporary Git checkout discovers untracked/staged content and default validator exits1 on its errors');
} finally {rmSync(root,{recursive:true,force:true});}
