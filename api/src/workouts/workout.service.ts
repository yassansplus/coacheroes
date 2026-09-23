import { WorkoutAi } from './workout-ai';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { createHash,randomUUID } from 'node:crypto';
import { JournalEntry,User,Onboarding } from '../database/entities';
import { WorkoutSession,ProgramBlock } from './workout.entity';
import { summarizeWorkout,type WorkoutWrite } from './workout.schema';
@Injectable()
export class WorkoutService {
 private readonly analyses=new Map<string,Promise<Record<string,unknown>>>();
 constructor(private readonly db:DataSource,private readonly ai:WorkoutAi){}
 async get(userId:string,id:string){const row=await this.db.getRepository(WorkoutSession).findOneBy({id,userId});if(!row)throw new NotFoundException();return row;}
 async active(userId:string){return this.db.getRepository(WorkoutSession).find({where:{userId,status:'in_progress'},order:{startedAt:'DESC'},take:50});}
 async list(userId:string,offset=0){return this.db.getRepository(WorkoutSession).find({where:{userId},order:{startedAt:'DESC',id:'DESC'},skip:offset,take:50});}
 async save(userId:string,id:string,input:WorkoutWrite){
  const hash=createHash('sha256').update(JSON.stringify({id,...input})).digest('hex');
  return this.db.transaction(async m=>{
   await m.findOneOrFail(User,{where:{id:userId},lock:{mode:'pessimistic_write'}});
   const receipt=(await m.query('SELECT * FROM workout_write_receipts WHERE user_id=$1 AND request_id=$2',[userId,input.requestId]))[0];
   if(receipt){if(receipt.request_hash!==hash)throw new ConflictException('Cette sauvegarde a déjà été utilisée.');return {session:await m.findOneByOrFail(WorkoutSession,{id,userId}),acknowledgedRevision:receipt.revision};}
   let row=await m.findOneBy(WorkoutSession,{id});
   if(row && row.userId!==userId)throw new NotFoundException();
   if((row?.revision??0)!==input.revision)throw new ConflictException('La séance a changé sur un autre appareil. Tes saisies locales sont conservées.');
   const s=structuredClone(input.snapshot);
   if(row && (row.snapshot.startedAt!==s.startedAt || row.programVersionId!==(s.workout.programVersionId??null)))throw new BadRequestException('L’origine de la séance ne peut pas changer.');
   if(row && row.status!=='in_progress' && s.status==='in_progress')throw new ConflictException('Cette séance est déjà terminée.');
   if(s.workout.programVersionId){const block=await m.findOneBy(ProgramBlock,{id:s.workout.programVersionId,userId});if(!block)throw new BadRequestException('Programme validé introuvable.');
    const sessions=(block.prescription as any).output?.result?.sessions??[];
    if(s.workout.sessionIndex===undefined || !sessions[s.workout.sessionIndex])throw new BadRequestException('Séance du programme inconnue.');
   }
   if(row){const prior=row.snapshot.exercises.flatMap(e=>e.sets.filter(v=>v!==null));const next=s.exercises.flatMap(e=>e.sets.filter(v=>v!==null));
    for(const previous of prior){const found=next.find(v=>v.id===previous.id);if(!found||found.occurredAt!==previous.occurredAt)throw new BadRequestException('Une série réalisée doit être conservée avec sa date initiale.');}
   }
   if(s.status!=='in_progress' && s.workout.kind==='free'){
    s.sportMetrics.durationSeconds=Math.floor(((s.endedAt??s.startedAt)-s.startedAt)/1000);
    // Only explicit, unambiguous measurements in the existing final comment are extracted.
    const distances=[...s.debrief.comment.matchAll(/(?:^|[;\n])\s*(?:distance\s*:\s*)?(\d+(?:[.,]\d+)?)\s*(km|m)\s*(?=$|[;\n])/gi)];
    if(s.sportMetrics.distanceMeters===null && distances.length===1){const value=Number(distances[0][1].replace(',','.'))*(distances[0][2].toLowerCase()==='km'?1000:1);if(value<=1000000)s.sportMetrics.distanceMeters=value;}
    const rounds=[...s.debrief.comment.matchAll(/(?:^|[;\n])\s*(\d+)\s*(?:rounds?|reprises?)\s*(?=$|[;\n])/gi)];
    if(s.sportMetrics.rounds===null && rounds.length===1 && Number(rounds[0][1])<=1000)s.sportMetrics.rounds=Number(rounds[0][1]);
   }
   const before=row?{snapshot:row.snapshot,summary:row.summary,revision:row.revision}:null;
   row??=m.create(WorkoutSession,{id,userId,revision:0});
   Object.assign(row,{snapshot:s,status:s.status,startedAt:new Date(s.startedAt),endedAt:s.endedAt?new Date(s.endedAt):null,programVersionId:s.workout.programVersionId??null,summary:summarizeWorkout(s),analysis:null,analysisAppliedAt:null,revision:row.revision+1});
   if(s.status==='completed'){
    const prior=await m.query(`SELECT DISTINCT ON(e->>'id') e->>'id' AS id,(v->>'weight')::float AS weight,(v->>'reps')::int AS reps FROM workout_sessions w CROSS JOIN LATERAL jsonb_array_elements(w.snapshot->'exercises') e CROSS JOIN LATERAL jsonb_array_elements(e->'sets') v WHERE w.user_id=$1 AND w.id<>$2 AND w.status='completed' AND w.started_at<$3 AND v<>'null'::jsonb AND (v->>'warmup')::boolean=false ORDER BY e->>'id',(v->>'weight')::float DESC,(v->>'reps')::int DESC`,[userId,id,row.startedAt]);
    row.summary.records=s.exercises.filter(e=>{const best=prior.find((p:{id:string})=>p.id===e.id);return best&&e.sets.some(v=>v&&!v.warmup&&(v.weight>best.weight||(v.weight===best.weight&&v.reps>best.reps)));}).length;
   }
   await m.save(row);
   await m.query('INSERT INTO workout_write_receipts(user_id,request_id,session_id,request_hash,revision) VALUES($1,$2,$3,$4,$5)',[userId,input.requestId,id,hash,row.revision]);
   await m.save(JournalEntry,m.create(JournalEntry,{userId,requestId:input.requestId,type:`workout.${!before?'started':s.status==='completed'?'completed':s.status==='abandoned'?'abandoned':'updated'}`,occurredAt:new Date(),payload:{schemaVersion:1,sessionId:id,before,after:{snapshot:s,summary:row.summary,revision:row.revision}}}));
   return {session:row,acknowledgedRevision:row.revision};
  });
 }
 async records(userId:string){return this.db.query(`SELECT DISTINCT ON(e->>'id') e->>'id' AS id, (v->>'weight')::float AS weight,(v->>'reps')::int AS reps
 FROM workout_sessions w CROSS JOIN LATERAL jsonb_array_elements(w.snapshot->'exercises') e CROSS JOIN LATERAL jsonb_array_elements(e->'sets') v
 WHERE w.user_id=$1 AND w.status='completed' AND v<>'null'::jsonb AND (v->>'warmup')::boolean=false
 ORDER BY e->>'id',(v->>'weight')::float DESC,(v->>'reps')::int DESC`,[userId]);}
 async history(userId:string,exerciseId:string){
  const rows=await this.db.getRepository(WorkoutSession).createQueryBuilder('w').where('w.user_id=:userId AND w.status=:status',{userId,status:'completed'})
   .andWhere(`w.snapshot->'exercises' @> :needle::jsonb`,{needle:JSON.stringify([{id:exerciseId}])}).orderBy('w.started_at','DESC').take(50).getMany();
  const record=(await this.records(userId)).find((r:{id:string})=>r.id===exerciseId)??null;
  return rows.map(w=>({record,sessionId:w.id,startedAt:w.startedAt,endedAt:w.endedAt,exercise:w.snapshot.exercises.find(e=>e.id===exerciseId)!,debrief:w.snapshot.debrief,pain:w.summary.pain,next:w.analysisAppliedAt?(w.analysis as any)?.recommendations?.find((r:any)=>r.exerciseId===exerciseId)??null:null}));
 }
 async analyze(userId:string,id:string):Promise<Record<string,unknown>>{
  const row=await this.get(userId,id);if(row.status!=='completed')throw new ConflictException('Termine ta séance avant son bilan.');if(row.analysis)return row.analysis;
  const key=`${userId}:${id}:${row.revision}`;const ongoing=this.analyses.get(key);if(ongoing)return ongoing;
  const work=(async()=>{
   const history=await this.db.getRepository(WorkoutSession).createQueryBuilder('w').where('w.user_id=:userId AND w.status=:status AND w.started_at<=:start',{userId,status:'completed',start:row.startedAt}).orderBy('w.started_at','DESC').take(30).getMany();
   const user=await this.db.getRepository(User).findOneByOrFail({id:userId});const profile=await this.db.getRepository(Onboarding).findOneBy({userId});
   const result=await this.ai.analyze(row.snapshot,history.map(w=>w.snapshot),profile?.profile??{},user.firstName);
   return this.db.transaction(async m=>{const current=await m.findOneOrFail(WorkoutSession,{where:{id,userId},lock:{mode:'pessimistic_write'}});if(current.revision!==row.revision)throw new ConflictException('La séance a changé. Relance le bilan.');if(current.analysis)return current.analysis;
    current.analysis={...result,sourceRevision:row.revision,source:'openai'};await m.save(current);await m.save(JournalEntry,m.create(JournalEntry,{userId,requestId:randomUUID(),type:'workout.analyzed',occurredAt:new Date(),payload:{sessionId:id,analysis:current.analysis}}));return current.analysis;
   });
  })().finally(()=>this.analyses.delete(key));this.analyses.set(key,work);return work;
 }
 async applyAnalysis(userId:string,id:string,revision:number){return this.db.transaction(async m=>{const row=await m.findOne(WorkoutSession,{where:{id,userId},lock:{mode:'pessimistic_write'}});if(!row)throw new NotFoundException();if(!row.analysis||row.revision!==revision||row.analysis.sourceRevision!==revision)throw new ConflictException('Le bilan a changé. Recharge-le.');if(!row.analysisAppliedAt){row.analysisAppliedAt=new Date();await m.save(row);await m.save(JournalEntry,m.create(JournalEntry,{userId,requestId:randomUUID(),type:'workout.analysis_applied',occurredAt:new Date(),payload:{sessionId:id,revision,analysis:row.analysis}}));}return row.analysis;});}
 async block(userId:string,id:string){
  const block=await this.db.getRepository(ProgramBlock).findOneBy({id,userId});if(!block)throw new NotFoundException();
  const sessions=await this.db.getRepository(WorkoutSession).findBy({userId,programVersionId:id});
  const templates=(block.prescription as any).output?.result?.sessions??[];
  const weeks=4+block.extensions;
  const occurrences=Array.from({length:weeks},(_,week)=>templates.map((s:any,index:number)=>{
   const date=new Date(block.startedAt); const mondayOffset=(date.getUTCDay()+6)%7;date.setUTCDate(date.getUTCDate()+((s.weekday-mondayOffset+7)%7)+week*7);date.setUTCHours(0,0,0,0);
   const matches=sessions.filter(w=>w.snapshot.workout.sessionIndex===index && w.snapshot.workout.week===week+1);
   return {week:week+1,sessionIndex:index,date:date.toISOString().slice(0,10),status:matches.some(w=>w.status==='completed')?'completed':matches.some(w=>w.status==='in_progress')?'in_progress':matches.some(w=>w.status==='abandoned')?'abandoned':date.getTime()<Date.now()-86400000?'missed':'planned'};
  })).flat();
  const completed=sessions.filter(s=>s.status==='completed');
  const pain=completed.some(s=>s.summary.pain);
  return {id,startedAt:block.startedAt,endsAt:block.endsAt,currentWeek:Math.min(weeks,Math.max(1,Math.floor((Date.now()-block.startedAt.getTime())/604800000)+1)),weeks,occurrences,
   completed:completed.length,abandoned:sessions.filter(s=>s.status==='abandoned').length,volume:completed.reduce((n,s)=>n+Number(s.summary.volume),0),durationSeconds:completed.reduce((n,s)=>n+Number(s.summary.durationSeconds),0),
   due:Date.now()>=block.endsAt.getTime(),recommendation:pain?'review_restrictions':completed.length<templates.length*2?'continue':'renew',pain};
 }
 async extend(userId:string,id:string){return this.db.transaction(async m=>{
  const block=await m.findOne(ProgramBlock,{where:{id,userId},lock:{mode:'pessimistic_write'}});if(!block)throw new NotFoundException();
  if(block.endsAt.getTime()>Date.now())return block;
  const before={endsAt:block.endsAt,extensions:block.extensions};block.endsAt=new Date(Math.max(Date.now(),block.endsAt.getTime())+14*86400000);block.extensions+=2;await m.save(block);
  await m.save(JournalEntry,m.create(JournalEntry,{userId,requestId:randomUUID(),type:'program.extended',occurredAt:new Date(),payload:{blockId:id,before,after:{endsAt:block.endsAt,extensions:block.extensions}}}));return block;
 });}
}
