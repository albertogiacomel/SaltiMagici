'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),artifacts=path.join(root,'artifacts');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let pageSession,command,errors=[];
async function run(){
 fs.mkdirSync(artifacts,{recursive:true});
 const {openBrowser}=await import('./game-kit-cdp.mjs');
 pageSession=await openBrowser(path.join(root,'dist'),{entry:'/index.html',artifactsPath:artifacts,blockRemoteAI:true});
 command=pageSession.command;errors=pageSession.errors;
 const url=process.env.GAME_URL||pageSession.url;
 if(process.env.GAME_URL)await command('Page.navigate',{url});
 await command('Runtime.enable');await command('Page.enable');await command('Emulation.setDeviceMetricsOverride',{width:1440,height:1200,deviceScaleFactor:1,mobile:false});
 const evaluate=async expression=>{const result=await command('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
 async function wait(expression){for(let i=0;i<150;i++){if(await evaluate(expression))return;await delay(100);}throw new Error('Browser condition failed: '+expression);}
 const click=selector=>evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
 const select=(id,value)=>evaluate(`(()=>{const e=document.getElementById(${JSON.stringify(id)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}))})()`);
 const shot=async name=>{const result=await command('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(artifacts,name+'.png'),Buffer.from(result.data,'base64'));};
 const key=(type,code,key)=>command('Input.dispatchKeyEvent',{type,code,key,windowsVirtualKeyCode:key==='ArrowRight'?39:key==='ArrowLeft'?37:key===' '?32:0});
 await wait('window.SaltiMagici?.getState().ready'+(process.env.GAME_URL?'&&location.origin==='+JSON.stringify(new URL(url).origin):''));
 // Choose no optional services before testing physical touch targets; keep that
 // refusal across reloads, as a visitor can do without accepting advertising.
 if(await evaluate('Boolean(window.SitePrivacy)')){
  await evaluate('window.SitePrivacy.ready.then(()=>true)');
  await evaluate("document.querySelector('#klaro .cn-decline')?.click()");
  await wait("document.cookie.includes('giacomel_privacy_v1=')");
 }
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
 // Cross the old 200 px boundary, then return using real keyboard controls.
 await key('keyDown','ArrowRight','ArrowRight');let jumpFrames=0;
 for(let frame=0;frame<50;frame++){
   const state=await evaluate('SaltiMagici.getState()');if(state.player.x>=720)break;
   if(state.player.grounded&&jumpFrames===0){await key('keyDown','Space',' ');jumpFrames=1;}
   else if(jumpFrames>0&&++jumpFrames>=3){await key('keyUp','Space',' ');jumpFrames=0;}
   await delay(200);
 }
 await key('keyUp','Space',' ');await key('keyUp','ArrowRight','ArrowRight');await delay(400);
 const forward=await evaluate('SaltiMagici.getState()');assert.ok(forward.player.x>=700,'Reach the first raised platforms');assert.ok(forward.camera>200,'Camera follows forward movement');
 await key('keyDown','ArrowLeft','ArrowLeft');await wait('SaltiMagici.getState().player.x<250');await key('keyUp','ArrowLeft','ArrowLeft');await delay(700);
 const returned=await evaluate('SaltiMagici.getState()');assert.ok(returned.player.x<forward.player.x-400,'Missed rewards allow sufficient backtracking');assert.ok(returned.camera<5,'Camera follows back to the first rewards');
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
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(artifacts,'browser_verification.json'),JSON.stringify({timestamp:new Date().toISOString(),url,status:'PASS',checks:['two worlds','live IT/EN','difficulty','keyboard movement and jump','reward-aware backtracking','camera follows return','pause','save/reload','independent saves','multi touch','responsive layout'],errors},null,2),'utf8');
 console.log('PASS: two worlds, live translations, settings, keyboard, reward-aware backtracking and camera, pause, persistence, independent saves and simultaneous touch controls.');
}
run().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{if(pageSession)await pageSession.close();});
