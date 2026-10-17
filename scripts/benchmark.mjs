import {performance} from 'node:perf_hooks';
import {writeFile,mkdir} from 'node:fs/promises';
import {createGame,step} from '../dist/engine.mjs';
const samples=[],iterations=600;
for(let round=0;round<30;round++){
  const state=createGame(round%3),start=performance.now();
  for(let i=0;i<iterations;i++)step(state,{right:true,jump:(i%50)<32});
  const duration=performance.now()-start;if(round>=5)samples.push(duration/iterations);
}
samples.sort((a,b)=>a-b);const mean=samples.reduce((s,v)=>s+v,0)/samples.length;
const report={timestamp:new Date().toISOString(),environment:{node:process.version,platform:process.platform},case:'25 batches of 600 fixed simulation steps; 5 warmup batches; all three levels',baseline:{status:'not_applicable',reason:'New game, no previous implementation or performance-change target'},final:{meanMs:mean,p50Ms:samples[Math.floor(samples.length*.5)],p95Ms:samples[Math.floor(samples.length*.95)],opsPerSecond:1000/mean},note:'Simulation-only benchmark; does not measure browser rendering or network latency.'};
await mkdir('artifacts',{recursive:true});await writeFile('artifacts/benchmark.json',JSON.stringify(report,null,2)+'\n','utf8');console.log(JSON.stringify(report.final));
