import { mkdir,readFile,writeFile,copyFile } from 'node:fs/promises';
const assets={};
for(const [file,type] of Object.entries({'index.html':'text/html','style.css':'text/css','app.js':'text/javascript','art.js':'text/javascript'})){
  assets[file==='index.html'?'/':'/'+file]=[type,await readFile('public/'+file,'utf8')];
}
const modules=await Promise.all(['game.js','service.js','worker.js'].map(async file=>{
  const source=await readFile(file,'utf8');
  return source.replace(/^import .*?;\r?\n/gm,'');
}));
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js','const assets='+JSON.stringify(assets)+';\n'+modules.join('\n'));
await copyFile('.openai/hosting.json','dist/.openai/hosting.json');
