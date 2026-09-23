const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),path=require('node:path');
function load(relative,deps={}){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:name=>{if(name in deps)return deps[name];throw Error(name);},Date,Map,Promise,JSON});return exports;}
test('daily adjustments affect only the accepted session today and never reset performed sets',()=>{
 const {applyDailyAdjustment:apply}=load('../src/services/daily/adjustment.ts');
 const workout={id:'workout',programVersionId:'program',sessionIndex:0,day:2,minutes:45,warmupMinutes:5};
 const exercises=[{id:'wger-1',rir:2,sets:[null,null,null,null]}];
 const proposal={id:'accepted',date:'2026-09-22',programVersionId:'program',sessionIndex:0,exercises:[{exerciseId:'wger-1',sets:3,rir:3}],blocks:null};
 const result=apply(workout,exercises,proposal,'2026-09-22');assert.equal(result.exercises[0].sets.length,3);assert.equal(result.exercises[0].rir,3);assert.equal(result.workout.minutes,35);assert.equal(exercises[0].sets.length,4);
 assert.equal(apply(workout,exercises,proposal,'2026-09-23'),null);
 assert.equal(apply({...workout,sessionIndex:1},exercises,proposal,'2026-09-22'),null);
 assert.equal(apply({...workout,programVersionId:'old'},exercises,proposal,'2026-09-22'),null);
 assert.equal(apply({...workout,scheduledDate:'2026-09-29'},exercises,proposal,'2026-09-22'),null);
 assert.equal(apply(workout,[{...exercises[0],sets:[{reps:8},null]}],proposal,'2026-09-22'),null);
 assert.equal(apply(workout,exercises,null,'2026-09-22'),null);
});
test('daily opening flag and draft survive a restart, remain date/account scoped and retain pending request IDs',async()=>{
 const files=new Map();const dependencies={'expo-file-system/legacy':{documentDirectory:'/private/',readAsStringAsync:async p=>files.get(p)??'',writeAsStringAsync:async(p,v)=>files.set(p,v)},'react-native':{Platform:{OS:'ios'}}};
 let storage=load('../src/storage/daily.ts',dependencies);
 await storage.updateDailyCache('user',c=>{c.days['2026-09-22']={opened:true,draft:{energy:2},pending:{requestId:'same-retry-id'}};});
 storage=load('../src/storage/daily.ts',dependencies);const value=await storage.readDailyCache('user');assert.equal(value.days['2026-09-22'].opened,true);assert.equal(value.days['2026-09-22'].pending.requestId,'same-retry-id');assert.equal(value.days['2026-09-23'],undefined);assert.equal(Object.keys((await storage.readDailyCache('other')).days).length,0);
});
