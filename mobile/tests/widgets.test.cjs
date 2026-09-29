const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const cache = new Map();
function load(file) {
  const absolute = path.resolve(__dirname, '../src', file);
  if (cache.has(absolute)) return cache.get(absolute);
  const box = { exports: {}, require: name => {
    if (name.endsWith('.json')) return require(path.resolve(path.dirname(absolute),name));
    return load(name.replace('@/', '') + '.ts');
  } };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText, box);
  cache.set(absolute, box.exports); return box.exports;
}
const {widgetSnapshot, nextWidgetDay, expiredWidgetSnapshot}=load('services/widgets/model.ts');
const now=new Date(2026,8,29,12,0,0);
const base={language:'fr',now,userId:'self'};
const program={status:'ready',acceptedAt:'2026-09-20',stale:false,result:{sessions:[{weekday:1,name:'Musculation A',estimatedMinutes:45}]}};
test('widget preserves real totals and distinguishes unknown nutrition from a recorded zero',()=>{
  assert.equal(widgetSnapshot(base).calories,'—');
  const p=widgetSnapshot({...base,calories:0,calorieGoal:2200,program});
  assert.equal(p.calories,'0');assert.equal(p.progress,0);assert.match(p.remaining,/2.?200/);
  assert.equal(p.workout,'Musculation A');assert.equal(p.workoutDetail,'45 min');
  const above=widgetSnapshot({...base,calories:2400,calorieGoal:2200});
  assert.equal(above.progress,1);assert.match(above.remaining,/200 kcal au-dessus/);
  assert.equal(widgetSnapshot({...base,calories:NaN}).calories,'—');
});
test('proposal, rest day, completed workout and finished block retain their business meaning',()=>{
  assert.equal(widgetSnapshot({...base,program:{...program,acceptedAt:null}}).workout,'Mon programme');
  assert.equal(widgetSnapshot({...base,program:{...program,stale:true}}).workout,'Mon programme');
  assert.equal(widgetSnapshot({...base,program,now:new Date(2026,8,30)}).workout,'Jour de récup');
  assert.equal(widgetSnapshot({...base,program,completed:true}).workout,'Séance terminée');
  assert.equal(widgetSnapshot({...base,program,blockDue:true}).workout,'Bloc terminé !');
});
test('only recent, shared friend activity reaches the widget, with no IDs or private metrics',()=>{
  const squad={friends:[{id:'f1',name:'Alex',shareActivity:true},{id:'f2',name:'Secret',shareActivity:false}],activity:[
    {userId:'f1',at:now.toISOString()}, {userId:'f2',at:now.toISOString()}, {userId:'stranger',at:now.toISOString()},
    {userId:'self',at:now.toISOString()}, {userId:'f1',at:new Date(now-2*86400000).toISOString()},
    {userId:'f1',at:new Date(+now+1000).toISOString()},
  ]};
  const original=JSON.stringify(squad);
  for(const language of ['fr','en','nl']){
    const p=widgetSnapshot({...base,language,squad});
    assert.equal(p.news.length,1);assert.match(p.news[0],/^Alex /);
    assert.ok(!JSON.stringify(p).includes('Secret'));assert.ok(!JSON.stringify(p).includes('userId'));
  }
  assert.equal(JSON.stringify(squad),original);
  const out=widgetSnapshot({...base,userId:undefined,squad,calories:1400,calorieGoal:2200,completed:true});
  assert.equal(out.news.length,0);assert.equal(out.calories,'—');assert.equal(out.workoutDone,false);
});
test('the timeline expires at the next LOCAL midnight and no longer presents yesterday as today',()=>{
  const end=nextWidgetDay(now);assert.equal(end.getHours(),0);assert.equal(end.getDate(),30);
  const stale=expiredWidgetSnapshot('nl',end);
  assert.equal(stale.calories,'—');assert.equal(stale.news.length,0);assert.equal(stale.updated,'');
  assert.equal(stale.heading,'Een nieuwe dag');assert.match(stale.workout,/Open de app/);
});
test('Expo Go and development builds without the native module safely skip widget imports',()=>{
  const source=fs.readFileSync(path.resolve(__dirname,'../src/services/widgets/bridge.ios.ts'),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
  for(const [environment,modulePresent,expected] of [['storeClient',true,false],['bare',false,false],['bare',true,true]]){
    const writes=[];
    const box={exports:{},require:name=>{
      if(name==='expo')return {requireOptionalNativeModule:()=>modulePresent?{}:null};
      if(name==='expo-constants')return {__esModule:true,default:{executionEnvironment:environment},ExecutionEnvironment:{StoreClient:'storeClient'}};
      if(name==='./TodayWidget'){assert.equal(expected,true);return {default:{updateTimeline:entries=>writes.push(entries)}};}
      throw Error(name);
    }};
    vm.runInNewContext(code,box);
    assert.equal(box.exports.supportsHomeWidget(),expected);
    box.exports.publishHomeWidget({calories:'42'});
    assert.equal(writes.length,expected?1:0);
  }
});

test('native widget survives Babel serialization, renders both sizes and handles empty gallery props',()=>{
  const babel=require('@babel/core');
  const preset=require.resolve('babel-preset-expo',{paths:[path.dirname(require.resolve('expo/package.json'))]});
  const result=babel.transformFileSync(path.resolve(__dirname,'../src/services/widgets/TodayWidget.tsx'),{
    configFile:false,babelrc:false,presets:[preset],caller:{name:'metro',platform:'ios',isDev:true,supportsStaticESM:false},
  });
  let layout;
  vm.runInNewContext(result.code,{exports:{},require:name=>name==='expo-widgets'?{createWidget:(name,fn)=>{assert.equal(name,'CoacHeroesToday');layout=fn;return {};}}:{}});
  assert.equal(typeof layout,'string');
  const sandbox={_jsx:(type,props)=>({type,props}),_jsxs:(type,props)=>({type,props})};
  for(const name of ['HStack','VStack','Text','Image','Link','Spacer','ProgressView'])sandbox[name]=name;
  for(const name of ['background','containerBackground','cornerRadius','font','foregroundStyle','frame','lineLimit','minimumScaleFactor','padding','tint','widgetURL'])sandbox[name]=(...args)=>({modifier:name,args});
  const render=vm.runInNewContext('('+layout+')',sandbox);
  assert.match(JSON.stringify(render({},{})),/COAC HEROES/);
  const props=widgetSnapshot({...base,calories:1450,calorieGoal:2200,program});
  for(const widgetFamily of ['systemMedium','systemLarge']){
    const tree=JSON.stringify(render(props,{widgetFamily}));
    assert.match(tree,/Musculation A/);assert.match(tree,/coac-heroes:\/\/\/nutrition/);
    assert.match(tree,/coac-heroes:\/\/\/program/);assert.match(tree,/coac-heroes:\/\/\/squad/);
  }
});
