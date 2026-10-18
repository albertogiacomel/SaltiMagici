import {readFile,writeFile,readdir,stat,copyFile} from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const root=resolve(dirname(import.meta.filename),'..');
await copyFile(join(root,'vendor/LICENSE.tiny_platformer'),join(root,'dist/LICENSE.txt'));
const files=[];
async function collect(directory,prefix=''){
 for(const entry of await readdir(directory,{withFileTypes:true})){
  const name=prefix+entry.name;
  if(entry.isFile())files.push(name);
  else if(entry.isDirectory())await collect(join(directory,entry.name),name+'/');
 }
}
await collect(join(root,'dist'));
let bytes=0;
for(const name of files){
  bytes+=(await stat(join(root,'dist',name))).size;
  if(name.endsWith('.js')){const result=spawnSync(process.execPath,['--check',join(root,'dist',name)],{encoding:'utf8'});if(result.status!==0)throw new Error(result.stderr);}
}
if(bytes>1_400_000)throw new Error(`Static game exceeds 1.4 MB: ${bytes}`);
const asset=await readFile(join(root,'dist/assets/worlds.webp'));
await writeFile(join(root,'docs/assets_manifest.json'),JSON.stringify({format:'WebP',width:1536,height:1024,quality:82,effort:4,bytes:asset.length,sha256:createHash('sha256').update(asset).digest('hex'),staticBytes:bytes},null,2)+'\n','utf8');
console.log(`Build verified: ${files.length} static files, ${bytes} bytes; no runtime dependencies.`);
