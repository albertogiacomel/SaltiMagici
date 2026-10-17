import {createGame,step,serialize,STEP} from './engine.mjs';
import {Renderer} from './renderer.mjs';
import {messages,levelNames} from './i18n.mjs';
const $=id=>document.getElementById(id),KEY='salti_magici_v1';
const defaults=()=>({version:1,theme:'classic',language:'it',sound:true,difficulty:'relaxed',worlds:{classic:{unlocked:1,best:[null,null,null],resume:null},elsa:{unlocked:1,best:[null,null,null],resume:null}}});
let preferences=defaults(),storageAvailable=true;
try{
  const saved=JSON.parse(localStorage.getItem(KEY)||'null');
  if(saved?.version===1){
    for(const key of ['theme','language','difficulty'])if(typeof saved[key]==='string')preferences[key]=saved[key];
    if(typeof saved.sound==='boolean')preferences.sound=saved.sound;
    for(const theme of ['classic','elsa'])if(saved.worlds?.[theme]){
      const world=saved.worlds[theme];preferences.worlds[theme].unlocked=Math.max(1,Math.min(3,Number(world.unlocked)||1));
      if(Array.isArray(world.best))preferences.worlds[theme].best=world.best.slice(0,3).map(b=>b&&Number.isFinite(b.score)?{score:Math.max(0,b.score),stars:Math.max(0,Math.min(3,Number(b.stars)||0))}:null);
      if(world.resume&&Number.isInteger(world.resume.level)&&world.resume.level>=0&&world.resume.level<preferences.worlds[theme].unlocked)preferences.worlds[theme].resume=world.resume;
    }
  }
}catch(error){storageAvailable=false;document.documentElement.dataset.storage='memory';}
if(!['classic','elsa'].includes(preferences.theme))preferences.theme='classic';
if(!['it','en'].includes(preferences.language))preferences.language='it';
if(!['relaxed','normal'].includes(preferences.difficulty))preferences.difficulty='relaxed';
const input={left:false,right:false,jump:false,run:false};
let state=createGame(0,preferences.difficulty),selected=0,playing=false,paused=false,ready=false,renderer,audio,toastTimer,settingsResume=false;
const t=key=>messages[preferences.language][key]||key;
const world=()=>preferences.worlds[preferences.theme];
const levelName=index=>levelNames[preferences.language][preferences.theme][index];
function save(){try{localStorage.setItem(KEY,JSON.stringify(preferences));}catch(error){if(storageAvailable)notify('storage');storageAvailable=false;document.documentElement.dataset.storage='memory';}}
function clearInput(){for(const key of Object.keys(input))input[key]=false;document.querySelectorAll('[data-control]').forEach(b=>b.classList.remove('pressed'));}
function tone(kind){
  if(!preferences.sound)return;
  try{
    audio??=new (window.AudioContext||window.webkitAudioContext)();
    if(audio.state==='suspended')audio.resume().catch(()=>{preferences.sound=false;save();translate();});
    const notes={jump:[360,540],coin:[800,1050],star:[650,820,1100],power:[500,630,840],checkpoint:[600,900],stomp:[270,420],hurt:[220,160],finish:[520,650,780,1040],retry:[330,440],shield:[600,400]}[kind]||[500];
    notes.forEach((frequency,i)=>{const oscillator=audio.createOscillator(),gain=audio.createGain(),at=audio.currentTime+i*.065;oscillator.type='sine';oscillator.frequency.setValueAtTime(frequency,at);gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.045,at+.01);gain.gain.exponentialRampToValueAtTime(.001,at+.14);oscillator.connect(gain).connect(audio.destination);oscillator.start(at);oscillator.stop(at+.15);});
  }catch(error){preferences.sound=false;save();$('mute').textContent='♪';}
}
function notify(key){clearTimeout(toastTimer);$('toast').dataset.message=key;$('toast').textContent=t(key);$('toast').hidden=false;toastTimer=setTimeout(()=>{$('toast').hidden=true;},2600);}
function updateHud(){
  $('hearts').textContent='♥ '.repeat(state.hearts).trim();$('hearts').setAttribute('aria-label',`${t('hearts')}: ${state.hearts}`);
  $('collectibles').textContent=`${preferences.theme==='elsa'?'✿':'●'} ${state.coins}`;$('collectibles').setAttribute('aria-label',`${t(preferences.theme==='elsa'?'flowers':'coins')}: ${state.coins}`);
  $('stars').textContent=`★ ${state.stars} / 3`;$('stars').setAttribute('aria-label',`${t('stars')}: ${state.stars}`);
  $('power').hidden=state.power<=0;$('power').textContent=`${preferences.theme==='elsa'?'❄':'✦'} ${Math.ceil(state.power)}s`;
}
function levelCards(){
  $('level-cards').replaceChildren();
  for(let i=0;i<3;i++){
    const button=document.createElement('button');button.className='level-card'+(selected===i?' selected':'');button.disabled=i>=world().unlocked;button.dataset.level=String(i);button.setAttribute('aria-pressed',String(selected===i));
    const badge=document.createElement('span');badge.textContent=button.disabled?'⌑':String(i+1).padStart(2,'0');
    const label=document.createElement('span'),title=document.createElement('strong'),detail=document.createElement('small');title.textContent=levelName(i);detail.textContent=button.disabled?t('locked'):'★'.repeat(world().best[i]?.stars||0)+'☆'.repeat(3-(world().best[i]?.stars||0));label.append(title,detail);button.append(badge,label);
    button.onclick=()=>{selected=i;state=createGame(i,preferences.difficulty);if(renderer)renderer.camera=0;translate();};$('level-cards').append(button);
  }
  $('total-stars').textContent=`★ ${world().best.reduce((sum,b)=>sum+(b?.stars||0),0)} / 9`;
}
function translate(){
  document.documentElement.lang=preferences.language;document.body.dataset.theme=preferences.theme;document.title=t('title')+' — '+t('tag');
  document.querySelectorAll('[data-i18n]').forEach(el=>{el.textContent=t(el.dataset.i18n);});
  $('play').textContent=t(ready?'play':'loading');$('level-title').textContent=levelName(selected);$('preview-title').textContent=levelName(selected);$('level-number').textContent=`${selected+1} / 3`;
  $('mute').textContent=preferences.sound?'♫':'♪';$('mute').setAttribute('aria-label',t('sound')+': '+t(preferences.sound?'on':'off'));$('mute').setAttribute('aria-pressed',String(preferences.sound));
  $('pause').setAttribute('aria-label',t('pause'));$('fullscreen').setAttribute('aria-label',t((document.fullscreenElement||document.body.classList.contains('fullscreen-mode'))?'exitFullscreen':'fullscreen'));$('game').setAttribute('aria-label',t('access'));
  $('world-picker').setAttribute('aria-label',preferences.language==='it'?'Mondi':'Worlds');
  document.querySelector('[data-control=left]').setAttribute('aria-label',preferences.language==='it'?'Sinistra':'Left');document.querySelector('[data-control=right]').setAttribute('aria-label',preferences.language==='it'?'Destra':'Right');
  document.querySelector('.dialog-heading button').setAttribute('aria-label',t('close'));
  document.querySelectorAll('[data-world]').forEach(button=>{button.classList.toggle('selected',button.dataset.world===preferences.theme);button.setAttribute('aria-pressed',String(button.dataset.world===preferences.theme));});
  $('language').value=preferences.language;$('sound').value=preferences.sound?'on':'off';$('difficulty').value=preferences.difficulty;
  $('continue').hidden=!world().resume;
  if(!$('toast').hidden)$('toast').textContent=t($('toast').dataset.message);
  if(state.finished)finishLabels();levelCards();updateHud();
}
function start(resume=false){
  if(!ready)return;
  const snapshot=resume?world().resume:null;if(snapshot)selected=snapshot.level;
  state=createGame(selected,preferences.difficulty,snapshot);playing=true;paused=false;clearInput();renderer.camera=Math.max(0,state.player.x-270);
  document.body.classList.add('playing');$('start-overlay').hidden=true;$('pause-overlay').hidden=true;$('finish-overlay').hidden=true;$('hud').hidden=false;$('pause').disabled=false;
  world().resume=serialize(state);save();translate();$('game').focus({preventScroll:true});$('game-shell').scrollIntoView({behavior:'instant',block:'start'});
  if(!storageAvailable)notify('storage');tone('checkpoint');
}
function setPause(value){if(!playing||state.finished)return;paused=value;clearInput();$('pause-overlay').hidden=!value;if(value){world().resume=serialize(state);save();}else $('game').focus({preventScroll:true});}
function menu(){if(playing&&!state.finished){world().resume=serialize(state);save();}playing=false;paused=false;clearInput();document.body.classList.remove('playing');$('start-overlay').hidden=false;$('pause-overlay').hidden=true;$('finish-overlay').hidden=true;$('hud').hidden=true;$('pause').disabled=true;state=createGame(selected,preferences.difficulty);if(renderer)renderer.camera=0;translate();}
function finishLabels(){
  $('finish-title').textContent=t(selected===2?'complete':'finish');$('next').textContent=t(selected===2?'again':'next');
  $('finish-stats').textContent=`${preferences.theme==='elsa'?'✿':'●'} ${state.coins}   ★ ${state.stars}/3   ${state.score}`;
}
function finish(){
  clearInput();const previous=world().best[selected];world().best[selected]={score:Math.max(previous?.score||0,state.score),stars:Math.max(previous?.stars||0,state.stars)};
  world().unlocked=Math.min(3,Math.max(world().unlocked,selected+2));world().resume=null;save();finishLabels();$('finish-overlay').hidden=false;$('pause').disabled=true;$('next').focus({preventScroll:true});
}
$('play').onclick=()=>start();$('continue').onclick=()=>start(true);$('pause').onclick=()=>setPause(!paused);$('resume').onclick=()=>setPause(false);$('restart').onclick=()=>start();$('to-menu').onclick=menu;$('finish-menu').onclick=menu;
$('next').onclick=()=>{selected=selected===2?0:selected+1;start();};
document.querySelectorAll('[data-world]').forEach(button=>button.onclick=()=>{preferences.theme=button.dataset.world;selected=0;state=createGame(0,preferences.difficulty);if(renderer)renderer.camera=0;save();translate();});
$('settings').onclick=()=>{settingsResume=playing&&!paused&&!state.finished;if(settingsResume)setPause(true);$('settings-dialog').showModal();};
$('settings-dialog').addEventListener('close',()=>{if(settingsResume)setPause(false);settingsResume=false;});
$('language').onchange=e=>{preferences.language=e.target.value;save();translate();};
$('sound').onchange=e=>{preferences.sound=e.target.value==='on';save();translate();};
$('difficulty').onchange=e=>{preferences.difficulty=e.target.value;state.difficulty=preferences.difficulty;state.maxHearts=preferences.difficulty==='relaxed'?5:3;state.hearts=Math.min(state.hearts,state.maxHearts);save();translate();};
$('mute').onclick=()=>{preferences.sound=!preferences.sound;save();translate();};
$('reset').onclick=()=>{if(window.confirm(t('resetAsk'))){preferences.worlds=defaults().worlds;selected=0;settingsResume=false;save();$('settings-dialog').close();menu();}};
const fullscreenTarget=$('game-shell');
const syncFullscreen=()=>{const active=!!document.fullscreenElement||fullscreenTarget.classList.contains('fullscreen-mode');fullscreenTarget.classList.toggle('fullscreen-mode',active);document.body.classList.toggle('fullscreen-mode',active);translate();};
document.addEventListener('fullscreenchange',syncFullscreen);
$('fullscreen').onclick=async()=>{const active=fullscreenTarget.classList.contains('fullscreen-mode');if(active){fullscreenTarget.classList.remove('fullscreen-mode');document.body.classList.remove('fullscreen-mode');if(document.fullscreenElement)try{await document.exitFullscreen();}catch(error){}return translate();}fullscreenTarget.classList.add('fullscreen-mode');document.body.classList.add('fullscreen-mode');if(fullscreenTarget.requestFullscreen)try{await fullscreenTarget.requestFullscreen();}catch(error){}translate();};
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',ArrowUp:'jump',KeyW:'jump',ShiftLeft:'run',ShiftRight:'run'};
window.addEventListener('keydown',event=>{if($('settings-dialog').open)return;if(event.code==='Escape'&&playing){event.preventDefault();setPause(!paused);return;}if(playing&&!paused&&keyMap[event.code]){event.preventDefault();input[keyMap[event.code]]=true;}});
window.addEventListener('keyup',event=>{if(keyMap[event.code])input[keyMap[event.code]]=false;});
document.querySelectorAll('[data-control]').forEach(button=>{
  const release=()=>{input[button.dataset.control]=false;button.classList.remove('pressed');};
  button.addEventListener('pointerdown',event=>{event.preventDefault();if(!playing||paused||state.finished)return;button.setPointerCapture(event.pointerId);input[button.dataset.control]=true;button.classList.add('pressed');});
  for(const name of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(name,release);
});
window.addEventListener('blur',()=>{clearInput();if(playing&&!paused)setPause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(playing&&!paused)setPause(true);}});
window.addEventListener('pagehide',()=>{if(playing&&!state.finished){world().resume=serialize(state);save();}});
let previous=0,accumulator=0,hudTick=0;
function frame(timestamp){
  const dt=Math.min(.1,(timestamp-previous)/1000||0);previous=timestamp;
  if(playing&&!paused&&!state.finished){
    accumulator+=dt;while(accumulator>=STEP){step(state,input);accumulator-=STEP;}
    for(const event of state.events.splice(0)){tone(event);if(event==='finish')finish();else if(event==='checkpoint'){world().resume=serialize(state);save();notify('checkpoint');}else if(event==='power')notify(preferences.theme==='elsa'?'powerElsa':'powerClassic');else if(['hurt','retry','shield'].includes(event))notify(event);}
  }else{accumulator=0;if(!playing)state.time+=dt;}
  renderer.draw(state,preferences.theme,!playing);hudTick+=dt;if(hudTick>.1){updateHud();hudTick=0;}requestAnimationFrame(frame);
}
translate();
const worlds=new Image();worlds.onload=()=>{renderer=new Renderer($('game'),worlds);ready=true;$('play').disabled=false;translate();requestAnimationFrame(frame);};
worlds.onerror=()=>{$('play').textContent=t('loadError');};worlds.src='assets/worlds.webp';
// Read-only snapshot supports smoke tests and accessibility/debug diagnostics.
Object.defineProperty(window,'SaltiMagici',{value:{getState:()=>({level:selected,theme:preferences.theme,language:preferences.language,playing,paused,ready,player:{...state.player},coins:state.coins,stars:state.stars,finished:state.finished,checkpoint:state.checkpoint,unlocked:world().unlocked}),getInput:()=>({...input})}});
