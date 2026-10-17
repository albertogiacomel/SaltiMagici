import {GameUIController} from './shared/videogames-kit/src/integration.mjs';
import {InputManager} from './shared/videogames-kit/src/input.mjs';
import {createGame,step,serialize,STEP} from './engine.mjs';
import {Renderer} from './renderer.mjs';
import {messages,levelNames} from './i18n.mjs';
import {CAMERA_OFFSET,TOAST_DURATION} from './config.mjs';
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
const inputManager=new InputManager();let gpJumpWas=false;
let state=createGame(0,preferences.difficulty),selected=0,playing=false,paused=false,ready=false,renderer,toastTimer,settingsResume=false;
const t=key=>messages[preferences.language][key]||key;
const world=()=>preferences.worlds[preferences.theme];
const levelName=index=>levelNames[preferences.language][preferences.theme][index];
const oldSettingsButton=$('settings');
const kit=new GameUIController({gameId:'salti-magici',mount:oldSettingsButton.parentElement,
 onOpen:()=>{inputManager.setEnabled(false);settingsResume=playing&&!paused&&!state.finished;if(settingsResume)setPause(true);},
 onClose:()=>{inputManager.setEnabled(true);if(settingsResume)setPause(false);settingsResume=false;}});
oldSettingsButton.remove();kit.settingsButton.id='settings';kit.dialog.element.id='settings-dialog';
for(const key of ['language','difficulty'])kit.dialog.element.querySelector('[data-setting='+key+']').id=key;
const resetButton=document.createElement('button');resetButton.type='button';resetButton.id='reset';resetButton.className='ag-button ag-button--danger';resetButton.dataset.i18n='reset';kit.dialog.element.append(resetButton);
function save(){try{localStorage.setItem(KEY,JSON.stringify(preferences));}catch(error){if(storageAvailable)notify('storage');storageAvailable=false;document.documentElement.dataset.storage='memory';}}
function clearInput(){inputManager.clear();}
function tone(kind){
 if(!preferences.sound||!kit.settings.getSnapshot().effects)return;
 const notes={jump:[360,540],coin:[800,1050],star:[650,820,1100],power:[500,630,840],checkpoint:[600,900],stomp:[270,420],hurt:[220,160],finish:[520,650,780,1040],retry:[330,440],shield:[600,400]}[kind]||[500];
 kit.audio.tone({frequencies:notes,spacing:.065,duration:.15,volume:.045});
}
function notify(key){clearTimeout(toastTimer);$('toast').dataset.message=key;$('toast').textContent=t(key);$('toast').hidden=false;toastTimer=setTimeout(()=>{$('toast').hidden=true;},TOAST_DURATION);}
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
  document.querySelectorAll('[data-world]').forEach(button=>{button.classList.toggle('selected',button.dataset.world===preferences.theme);button.setAttribute('aria-pressed',String(button.dataset.world===preferences.theme));});
  $('continue').hidden=!world().resume;
  if(!$('toast').hidden)$('toast').textContent=t($('toast').dataset.message);
  if(state.finished)finishLabels();levelCards();updateHud();
}
let musicTimer=null,musicPowered=false;
const musicTracks={classic:[261.63,329.63,392.00,329.63,261.63,293.66,329.63,261.63],classicPower:[523.25,659.25,783.99,659.25,523.25,587.33,659.25,523.25],elsa:[220.00,261.63,329.63,261.63,220.00,196.00,220.00,174.61],elsaPower:[329.63,392.00,493.88,392.00,329.63,293.66,329.63,246.94]};
function stopMusic(){if(musicTimer){clearTimeout(musicTimer);musicTimer=null;}}
function playMusic(){
 if(!preferences.sound||!kit.settings.getSnapshot().music||!playing||paused)return;
 stopMusic();const key=preferences.theme+(state.power>0?'Power':'');const track=musicTracks[key]||musicTracks.classic;musicPowered=state.power>0;let i=0;
 const note=()=>{if(!playing||paused||!preferences.sound||!kit.settings.getSnapshot().music){musicTimer=null;return;}kit.audio.tone({frequencies:[track[i%track.length]],channel:'music',duration:.24,volume:.025,wave:'square'});i++;musicTimer=setTimeout(note,250);};note();
}
function start(resume=false){
  if(!ready)return;
  const snapshot=resume?world().resume:null;if(snapshot)selected=snapshot.level;
  state=createGame(selected,preferences.difficulty,snapshot);playing=true;paused=false;clearInput();renderer.camera=Math.max(0,state.player.x-CAMERA_OFFSET);
  document.body.classList.add('playing');$('start-overlay').hidden=true;$('pause-overlay').hidden=true;$('finish-overlay').hidden=true;$('hud').hidden=false;$('pause').disabled=false;
  world().resume=serialize(state);save();translate();$('game').focus({preventScroll:true});$('game-shell').scrollIntoView({behavior:'instant',block:'start'});
  if(!storageAvailable)notify('storage');tone('checkpoint');playMusic();
}
function setPause(value){if(!playing||state.finished)return;paused=value;clearInput();$('pause-overlay').hidden=!value;if(value){world().resume=serialize(state);save();stopMusic();}else {$('game').focus({preventScroll:true});playMusic();}}
function menu(){if(playing&&!state.finished){world().resume=serialize(state);save();}playing=false;paused=false;clearInput();stopMusic();document.body.classList.remove('playing');$('start-overlay').hidden=false;$('pause-overlay').hidden=true;$('finish-overlay').hidden=true;$('hud').hidden=true;$('pause').disabled=true;state=createGame(selected,preferences.difficulty);if(renderer)renderer.camera=0;translate();}
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
function applyKitSettings(){
 const value=kit.settings.getSnapshot();preferences.language=value.language;preferences.sound=!value.muted&&(value.effects||value.music);preferences.difficulty=value.difficulty;
 state.difficulty=value.difficulty;state.maxHearts=value.difficulty==='relaxed'?5:3;state.hearts=Math.min(state.hearts,state.maxHearts);
 save();translate();stopMusic();if(playing&&!paused)playMusic();
}
kit.settings.subscribe(applyKitSettings);
$('mute').onclick=()=>kit.settings.update({muted:!kit.settings.getSnapshot().muted});
$('reset').onclick=()=>{if(window.confirm(t('resetAsk'))){preferences.worlds=defaults().worlds;selected=0;settingsResume=false;save();$('settings-dialog').close();menu();}};
kit.fullscreen.subscribe(active=>{document.body.classList.toggle('fullscreen-mode',active);$('game-shell').classList.toggle('fullscreen-mode',active);translate();});
$('fullscreen').onclick=()=>kit.fullscreen.toggle().catch(error=>console.error('Fullscreen:',error));
window.addEventListener('keydown',event=>{if(kit.dialog.element.open)return;if(event.code==='Escape'&&playing){event.preventDefault();setPause(!paused);}});
for(const button of document.querySelectorAll('[data-control]'))inputManager.bindButton(button,button.dataset.control);
window.addEventListener('blur',()=>{clearInput();if(playing&&!paused)setPause(true);});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(playing&&!paused)setPause(true);}});
window.addEventListener('pagehide',()=>{if(playing&&!state.finished){world().resume=serialize(state);save();}});
function gamepadInput(){const value=inputManager.poll();return {...value,start:value.pause};}
let previous=0,accumulator=0,hudTick=0;
function frame(timestamp){
  const dt=Math.min(.1,(timestamp-previous)/1000||0);previous=timestamp;
  const gp=gamepadInput();
  const hasPad=navigator.getGamepads && Array.from(navigator.getGamepads()).some(p=>p&&p.connected);
  if(!playing&&!paused&&hasPad){
    if(gp.start&&!gpJumpWas){if(!$('finish-overlay').hidden)$('next').click();else if(!$('start-overlay').hidden)$('play').click();}
  }
  gpJumpWas=gp.start;
  if(playing&&!paused&&!state.finished){
    const frameInput=inputManager.poll();
    accumulator+=dt;while(accumulator>=STEP){step(state,frameInput);accumulator-=STEP;}    if(preferences.sound && (state.power>0)!==musicPowered){musicPowered=state.power>0;playMusic();}
    for(const event of state.events.splice(0)){tone(event);if(event==='finish')finish();else if(event==='checkpoint'){world().resume=serialize(state);save();notify('checkpoint');}else if(event==='power')notify(preferences.theme==='elsa'?'powerElsa':'powerClassic');else if(['hurt','retry','shield'].includes(event)){notify(event);if(renderer)renderer.camera=Math.max(0,state.player.x-CAMERA_OFFSET);}}
  }else{accumulator=0;if(!playing)state.time+=dt;}
  renderer.draw(state,preferences.theme,!playing);hudTick+=dt;if(hudTick>.1){updateHud();hudTick=0;}requestAnimationFrame(frame);
}
applyKitSettings();
const worlds=new Image();worlds.onload=()=>{renderer=new Renderer($('game'),worlds);ready=true;$('play').disabled=false;translate();requestAnimationFrame(frame);};
worlds.onerror=()=>{$('play').textContent=t('loadError');};worlds.src='assets/worlds.webp';
// Read-only snapshot supports smoke tests and accessibility/debug diagnostics.
Object.defineProperty(window,'SaltiMagici',{value:{getState:()=>({level:selected,theme:preferences.theme,language:preferences.language,playing,paused,ready,camera:renderer?.camera??0,player:{...state.player},coins:state.coins,stars:state.stars,finished:state.finished,checkpoint:state.checkpoint,unlocked:world().unlocked}),getInput:()=>inputManager.poll()}});
