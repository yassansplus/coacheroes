import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { JournalEntry, Onboarding, User } from '../database/entities';
import { ProgramBlock } from '../workouts/workout.entity';
import { TrainingProgram } from '../program/program.entity';
import { dailyWriteSchema, localClock, type DailyData } from './daily.schema';
import type { z } from 'zod';

@Injectable()
export class DailyService {
  constructor(private readonly db: DataSource) {}
  async preference(userId:string, timezone:string) {
    await this.db.query('INSERT INTO daily_preferences(user_id,timezone) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET timezone=EXCLUDED.timezone',[userId,timezone]);
  }
  async today(userId:string, timezone:string) {
    await this.preference(userId,timezone);
    const {date,hour}=localClock(timezone);
    const [row]=await this.db.query('SELECT *, date::text AS date FROM daily_check_ins WHERE user_id=$1 AND date=$2',[userId,date]);
    const history=await this.db.query(`SELECT date::text AS date,(data->>'weightKg')::float AS weight FROM daily_check_ins WHERE user_id=$1 AND date <= $2 AND completed_at IS NOT NULL AND data->>'weightKg' IS NOT NULL ORDER BY date DESC LIMIT 90`,[userId,date]);
    const previous=history.find((r:{date:string})=>r.date<date);
    const onboarding=await this.db.getRepository(Onboarding).findOneBy({userId});
    const initial=Number(String(onboarding?.profile.weight??'').replace(',','.'));
    const reference=previous?{weight:previous.weight,date:previous.date}:initial>=30&&initial<=350?{weight:initial,date:null}:null;
    return { date, timezone, row:row??null, reference, history:history.reverse(), shouldOpen:hour>=7&&!row?.opened_at&&!row?.completed_at };
  }
  async opened(userId:string, timezone:string, now=new Date()) {
    const {date,hour}=localClock(timezone,now);
    if(hour<7)return {open:false,date};
    const rows=await this.db.query(`INSERT INTO daily_check_ins(user_id,date,timezone,opened_at) VALUES($1,$2,$3,now()) ON CONFLICT(user_id,date) DO UPDATE SET opened_at=now() WHERE daily_check_ins.opened_at IS NULL AND daily_check_ins.completed_at IS NULL RETURNING date`,[userId,date,timezone]);
    return {open:rows.length>0,date};
  }
  async proposal(userId:string, timezone:string, data:DailyData, manager:EntityManager=this.db.manager) {
    const {date}=localClock(timezone);
    const weekday=(new Date(`${date}T12:00:00Z`).getUTCDay()+6)%7;
    const program=await manager.findOneBy(TrainingProgram,{userId});
    const index=program?.output?.result.sessions.findIndex(s=>s.weekday===weekday)??-1;
    const session=index>=0?program?.output?.result.sessions[index]:undefined;
    const base={id:null as string|null,date,programVersionId:null as string|null,sessionIndex:index,changes:[] as {title:string;before:string;after:string}[],exercises:[] as {exerciseId:string;sets:number;rir:number}[],blocks:null as unknown,reason:'Pas de séance prévue aujourd’hui. Profite de ta récupération.'};
    if(!program?.acceptedAt||program.status!=='ready'||!session)return base;
    const block=await manager.findOneBy(ProgramBlock,{id:program.runId,userId});
    if(block&&block.endsAt.getTime()<=Date.now())return {...base,reason:'Ton bloc est terminé. Fais le bilan du programme avant de repartir.'};
    const already=await manager.query(`SELECT 1 FROM workout_sessions WHERE user_id=$1 AND program_version_id=$2 AND (snapshot->'workout'->>'sessionIndex')::int=$3 AND (snapshot->'workout'->>'scheduledDate'=$4 OR (started_at AT TIME ZONE $5)::date=$4::date) LIMIT 1`,[userId,program.runId,index,date,timezone]);
    if(already.length)return {...base,reason:'Ta séance a déjà commencé : son contenu reste inchangé.'};
    const tired=data.sleepMinutes<360||data.energy<=2||data.soreness==='strong'||data.pains.length>0;
    if(!tired)return {...base,reason:'Tu peux garder ta séance prévue. Ajuste l’effort selon tes sensations.'};
    const exercises=session.exercises.map(e=>({exerciseId:`wger-${e.exerciseId}`,sets:Math.max(1,Math.floor(e.sets*.75)),rir:Math.max(3,e.rir)}));
    const before=session.exercises.reduce((n,e)=>n+e.sets,0),after=exercises.reduce((n,e)=>n+e.sets,0);
    if(before!==after)base.changes.push({title:'Volume total',before:`${before} séries`,after:`${after} séries`});
    if(session.exercises.some(e=>e.rir<3))base.changes.push({title:'Intensité',before:'Effort prévu',after:'Au moins 3 reps en réserve'});
    const blocks=session.blocks?.map(b=>({...b,minutes:Math.max(1,Math.floor(b.minutes*.75)),intensity:'easy' as const}));
    if(blocks?.length)base.changes.push({title:'Blocs sportifs',before:`${session.blocks!.reduce((n,b)=>n+b.minutes,0)} min`,after:`${blocks.reduce((n,b)=>n+b.minutes,0)} min · facile`});
    const result={...base,programVersionId:program.runId,exercises,blocks:blocks??null,reason:data.pains.length?'On allège aujourd’hui. Évite tout mouvement douloureux ; cet ajustement ne valide pas une reprise malgré la douleur.':'On allège aujourd’hui pour laisser de la place à la récupération.'};
    result.id=createHash('sha256').update(JSON.stringify({date,program:program.runId,index,data,result})).digest('hex');
    return result;
  }
  async save(userId:string,input:z.infer<typeof dailyWriteSchema>) {
    const today=localClock(input.timezone).date;
    if(input.date!==today)throw new ConflictException('Le jour a changé. Recharge le bilan du jour.');
    const hash=createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return this.db.transaction(async m=>{
      await m.findOneOrFail(User,{where:{id:userId},lock:{mode:'pessimistic_write'}});
      const [receipt]=await m.query('SELECT * FROM daily_write_receipts WHERE user_id=$1 AND request_id=$2',[userId,input.requestId]);
      if(receipt){if(receipt.payload_hash!==hash)throw new ConflictException('Identifiant de sauvegarde déjà utilisé.');return (await m.query('SELECT *,date::text AS date FROM daily_check_ins WHERE user_id=$1 AND date=$2',[userId,input.date]))[0];}
      const [previous]=await m.query('SELECT * FROM daily_check_ins WHERE user_id=$1 AND date=$2 FOR UPDATE',[userId,input.date]);
      if((previous?.revision??0)!==input.revision)throw new ConflictException('Ce bilan a changé sur un autre appareil. Recharge-le.');
      const proposal=input.adjustment==='accepted'?await this.proposal(userId,input.timezone,input.data,m):null;
      if(input.adjustment==='accepted'&&(!proposal?.id||proposal.id!==input.proposalId))throw new ConflictException('La séance ou ton bilan a changé. Vérifie le nouvel ajustement.');
      const adjustment={decision:input.adjustment,proposal};
      const [row]=await m.query(`INSERT INTO daily_check_ins(user_id,date,timezone,revision,opened_at,completed_at,data,adjustment) VALUES($1,$2,$3,1,now(),now(),$4,$5) ON CONFLICT(user_id,date) DO UPDATE SET timezone=EXCLUDED.timezone,revision=daily_check_ins.revision+1,completed_at=COALESCE(daily_check_ins.completed_at,now()),data=EXCLUDED.data,adjustment=EXCLUDED.adjustment,updated_at=now() RETURNING *,date::text AS date`,[userId,input.date,input.timezone,JSON.stringify(input.data),JSON.stringify(adjustment)]);
      await m.query('INSERT INTO daily_write_receipts(user_id,request_id,payload_hash,date) VALUES($1,$2,$3,$4)',[userId,input.requestId,hash,input.date]);
      await m.save(JournalEntry,m.create(JournalEntry,{userId,requestId:randomUUID(),type:previous?.completed_at?'daily.corrected':'daily.completed',occurredAt:new Date(),payload:{date:input.date,before:previous??null,after:row}}));
      return row;
    });
  }
  async device(userId:string,sessionHash:string,timezone:string,token:string|null) {
    await this.preference(userId,timezone);
    if(!token){await this.db.query('DELETE FROM daily_push_devices WHERE user_id=$1 AND session_hash=$2',[userId,sessionHash]);return;}
    if(!/^(ExponentPushToken|ExpoPushToken)\[[\w-]+\]$/.test(token))throw new BadRequestException('Token de notification invalide.');
    await this.db.query('INSERT INTO daily_push_devices(token,user_id,session_hash) VALUES($1,$2,$3) ON CONFLICT(token) DO UPDATE SET user_id=EXCLUDED.user_id,session_hash=EXCLUDED.session_hash,updated_at=now()',[token,userId,sessionHash]);
  }
}
