import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { localClock } from './daily.schema';

@Injectable()
export class DailyReminder implements OnModuleInit, OnModuleDestroy {
 private timer?:ReturnType<typeof setInterval>;
 private busy=false;
 private readonly logger=new Logger(DailyReminder.name);
 constructor(private readonly db:DataSource,private readonly config:ConfigService){}
 onModuleInit(){if(this.config.get('DISABLE_DAILY_WORKER')==='true')return;this.timer=setInterval(()=>void this.tick().catch(()=>this.logger.warn('Daily reminders could not be processed.')),30000);this.timer.unref();}
 onModuleDestroy(){clearInterval(this.timer);}
 async tick(now=new Date()){
  if(this.busy)return;this.busy=true;
  try{
   const users=await this.db.query(`SELECT p.* FROM daily_preferences p WHERE EXISTS(SELECT 1 FROM daily_push_devices d JOIN sessions s ON s.token_hash=d.session_hash WHERE d.user_id=p.user_id AND s.revoked_at IS NULL AND s.expires_at>now())`);
   for(const user of users){
    const {date,hour,minute}=localClock(user.timezone,now);
    if(hour!==9||minute>=5)continue;
    await this.db.transaction(async m=>{
     // Same account lock as completion: decide against the latest committed daily state.
     await m.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[user.user_id]);
     if((await m.query('SELECT 1 FROM daily_check_ins WHERE user_id=$1 AND date=$2 AND completed_at IS NOT NULL',[user.user_id,date])).length)return;
     const tokens=await m.query(`SELECT d.token FROM daily_push_devices d JOIN sessions s ON s.token_hash=d.session_hash WHERE d.user_id=$1 AND s.revoked_at IS NULL AND s.expires_at>now() ORDER BY d.updated_at DESC LIMIT 1`,[user.user_id]);
     if(!tokens.length)return;
     const claimed=await m.query(`INSERT INTO daily_reminders(user_id,date,status) VALUES($1,$2,'sending') ON CONFLICT DO NOTHING RETURNING user_id`,[user.user_id,date]);
     if(!claimed.length)return;
     // Do not retry an ambiguous send: Expo cannot guarantee exactly-once delivery.
     try{
      const response=await fetch('https://exp.host/--/api/v2/push/send',{method:'POST',headers:{'Content-Type':'application/json',...(this.config.get<string>('EXPO_ACCESS_TOKEN')?{Authorization:`Bearer ${this.config.get<string>('EXPO_ACCESS_TOKEN')}`}:{})},signal:AbortSignal.timeout(8000),body:JSON.stringify({to:tokens[0].token,title:'Ton bilan du matin',body:'Comment tu te sens aujourd’hui ? Fais le point en 1 minute.',sound:'default',channelId:'daily',ttl:3600,data:{type:'daily',date}})});
      const result=await response.json() as {data?:{status:string;id?:string;details?:{error?:string}}};
      const ticket=result.data;
      await m.query('UPDATE daily_reminders SET status=$3,tickets=$4 WHERE user_id=$1 AND date=$2',[user.user_id,date,response.ok&&ticket?.status==='ok'?'sent':'failed',JSON.stringify(ticket?.id?[{id:ticket.id,token:tokens[0].token}]:[])]);
      if(ticket?.details?.error==='DeviceNotRegistered')await m.query('DELETE FROM daily_push_devices WHERE token=$1',[tokens[0].token]);
     }catch{await m.query("UPDATE daily_reminders SET status='unknown' WHERE user_id=$1 AND date=$2",[user.user_id,date]);this.logger.warn('Daily reminder delivery could not be confirmed.');}
    });
   }
   await this.receipts();
  }finally{this.busy=false;}
 }
 async receipts(){
  const rows=await this.db.query("SELECT user_id,date::text,tickets FROM daily_reminders WHERE status='sent' AND created_at<now()-interval '15 minutes' LIMIT 100");
  for(const row of rows){
   const tickets=row.tickets as {id:string;token:string}[];
   if(!tickets.length)continue;
   const response=await fetch('https://exp.host/--/api/v2/push/getReceipts',{method:'POST',headers:{'Content-Type':'application/json',...(this.config.get<string>('EXPO_ACCESS_TOKEN')?{Authorization:`Bearer ${this.config.get<string>('EXPO_ACCESS_TOKEN')}`}:{})},signal:AbortSignal.timeout(8000),body:JSON.stringify({ids:tickets.map(t=>t.id)})});
   if(!response.ok)continue;
   const result=await response.json() as {data?:Record<string,{status:string;details?:{error?:string}}>};
   if(!tickets.every(t=>result.data?.[t.id]))continue;
   for(const ticket of tickets)if(result.data?.[ticket.id]?.details?.error==='DeviceNotRegistered')await this.db.query('DELETE FROM daily_push_devices WHERE token=$1',[ticket.token]);
   await this.db.query('UPDATE daily_reminders SET status=$3 WHERE user_id=$1 AND date=$2',[row.user_id,row.date,tickets.every(t=>result.data?.[t.id]?.status==='ok')?'delivered':'failed']);
  }
 }
}
