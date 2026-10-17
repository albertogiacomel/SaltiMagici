'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process');
const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'artifacts');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let browser,server,socket,command;const errors=[];
async function port(){const probe=http.createServer();await new Promise(resolve=>probe.listen(0,'127.0.0.1',resolve));const value=probe.address().port;await new Promise(resolve=>probe.close(resolve));return value;}
async function run(){
 fs.mkdirSync(artifacts,{recursive:true});
 let url=process.env.GAME_URL;
 if(!url){const localPort=await port();url='http://127.0.0.1:'+localPort;server=http.createServer((req,res)=>{const pathname=decodeURIComponent(new URL(req.url,url).pathname),file=path.resolve(root,'dist','.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(path.join(root,'dist')+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404).end();return;}res.setHeader('Content-Type',({'.mjs':'application/javascript','.css':'text/css','.html':'text/html','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(file)]||'text/plain');res.end(data);});});await new Promise(resolve=>server.listen(localPort,'127.0.0.1',resolve));}
 const debug=await port(),binary=process.env.BROWSER_BINARY||path.join(process.env['ProgramFiles(x86)']||'','Microsoft/Edge/Application/msedge.exe');
 browser=spawn(binary,['--headless','--disable-gpu','--no-first-run','--remote-debugging-port='+debug,'--user-data-dir='+path.join(artifacts,'edge_'+Date.now()),url],{windowsHide:true,stdio:'ignore'});
 let page;for(let i=0;i<100;i++){try{page=(await(await fetch('http://127.0.0.1:'+debug+'/json')).json()).find(p=>p.url.startsWith(url));if(page)break;}catch(error){if(i===99)throw new Error('Browser unavailable',{cause:error});}await delay(100);}assert.ok(page);
 socket=new WebSocket(page.webSocketDebuggerUrl);await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
 let id=0;const pending=new Map();socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const task=pending.get(message.id);if(task){clearTimeout(task.timer);pending.delete(message.id);message.error?task.reject(message.error):task.resolve(message.result);}}else if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);};
 command=(method,params={})=>new Promise((resolve,reject)=>{const current=++id,timer=setTimeout(()=>{pending.delete(current);reject(new Error('CDP timeout: '+method));},15000);pending.set(current,{resolve,reject,timer});socket.send(JSON.stringify({id:current,method,params}));});
 await command('Runtime.enable');await command('Page.enable');await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1200,deviceScaleFactor:1,mobile:false});
 const evaluate=async expression=>{const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
 async function wait(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw new Error('Browser condition failed: '+expression);}
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const select=(id,value)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 const shot=async name=>{const result=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(result.data,'base64'));};
 const key=(type,code,key)=>command('Input.dispatchKeyEvent',{type,code,key,windowsVirtualKeyCode:key==='ArrowRight'?39:key===' '?32:0});
 await wait('window.SaltiMagici?.getState().ready');
 assert.equal(await evaluate("document.querySelectorAll('.level-card:disabled').length"),2);
 await shot('classic_menu');await click('[data-world="elsa"]');await shot('elsa_menu');
 await click('#settings');await select('language','en');assert.equal(await evaluate("document.documentElement.lang"),'en');assert.equal(await evaluate("document.querySelector('[data-i18n=jump]').textContent"),'Jump');
 await evaluate("(()=>{const e=document.querySelector('[data-setting=muted]');e.checked=true;e.dispatchEvent(new Event('change',{bubbles:true}));})()");await select('difficulty','normal');
 // close() queues the native close event; wait for its input/focus cleanup before playing.
 await evaluate("new Promise(resolve=>{const dialog=document.getElementById('settings-dialog');dialog.addEventListener('close',resolve,{once:true});dialog.close();})");
 await click('#play');await wait('SaltiMagici.getState().playing&&!SaltiMagici.getState().paused');
 assert.equal(await evaluate("document.getElementById('hearts').getAttribute('aria-label')"),'Hearts: 3');
 const before=await evaluate('SaltiMagici.getState().player.x');await key('keyDown','ArrowRight','ArrowRight');assert.equal(await evaluate('SaltiMagici.getInput().right'),true,'Keyboard input enabled after settings close');await delay(450);await key('keyDown','Space',' ');await delay(250);await key('keyUp','Space',' ');await key('keyUp','ArrowRight','ArrowRight');
 assert.ok(await evaluate('SaltiMagici.getState().player.x')>before+40,'Keyboard moves player');
 await shot('elsa_play');
 // Save a canvas capture for the portfolio card without external image assets.
 const canvas=await evaluate("document.getElementById('game').toDataURL('image/png').split(',')[1]");fs.writeFileSync(path.join(artifacts,'portfolio.png'),Buffer.from(canvas,'base64'));
 await click('#settings');assert.equal(await evaluate('SaltiMagici.getState().paused'),true);await select('language','it');assert.equal(await evaluate("document.querySelector('[data-i18n=jump]').textContent"),'Salta');assert.equal(await evaluate("document.querySelector('[data-i18n=resume]').textContent"),'Riprendi');await evaluate("document.getElementById('settings-dialog').close()");await wait('!SaltiMagici.getState().paused');
 await click('#pause');const stopped=await evaluate('SaltiMagici.getState().player.x');await delay(150);assert.equal(await evaluate('SaltiMagici.getState().player.x'),stopped);await click('#to-menu');
 await command('Page.reload');await wait('window.SaltiMagici?.getState().ready');assert.equal(await evaluate('SaltiMagici.getState().theme'),'elsa');assert.equal(await evaluate('document.documentElement.lang'),'it');assert.equal(await evaluate("document.getElementById('continue').hidden"),false);
 await click('#continue');await command('Emulation.setDeviceMetricsOverride',{width:844,height:390,deviceScaleFactor:1,mobile:true});await command('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:5});
 await evaluate('window.scrollTo(0,0)');
 const positions=await evaluate("['right','jump'].map(key=>{const r=document.querySelector('[data-control='+key+']').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}})");
 await command('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:positions.map((p,id)=>({...p,id,radiusX:4,radiusY:4,force:1}))});await delay(120);
 assert.equal(await evaluate('SaltiMagici.getInput().right&&SaltiMagici.getInput().jump'),true,'Simultaneous touch movement and jump');
 await command('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await delay(80);assert.equal(await evaluate('Object.values(SaltiMagici.getInput()).some(Boolean)'),false,'Touch release clears controls');
 await shot('mobile_play');assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true);
 await click('#pause');await click('#to-menu');await command('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate('window.scrollTo(0,0)');await shot('mobile_menu');assert.equal(await evaluate('document.documentElement.scrollWidth<=window.innerWidth'),true);
 await click('[data-world="classic"]');assert.equal(await evaluate("document.getElementById('continue').hidden"),true,'Independent progress per world');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(artifacts,'browser_verification.json'),JSON.stringify({timestamp:new Date().toISOString(),url,status:'PASS',checks:['two worlds','live IT/EN','difficulty','keyboard movement and jump','pause','save/reload','independent saves','multi touch','responsive layout'],errors},null,2),'utf8');
 console.log('PASS: two worlds, live translations, settings, keyboard, pause, persistence, independent saves and simultaneous touch controls.');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(command&&socket?.readyState===WebSocket.OPEN){try{await command('Browser.close');}catch(error){console.error('Browser cleanup:',error.message);}}socket?.close();browser?.kill();if(server)await new Promise(resolve=>server.close(resolve));});
