import * as Crypto from 'expo-crypto';
import { apiRequest,ApiError } from '@/services/http';
import { getSessionToken } from '@/storage/session';
import {readWorkouts,updateWorkouts,type LocalWorkout} from '@/storage/workouts';
import type {WorkoutSnapshot,WorkoutRecord,ExerciseHistoryEntry,BlockProgress,WorkoutAnalysis} from './types';
export type * from './types';
export async function exerciseHistory(id:string,user?:string):Promise<ExerciseHistoryEntry[]>{
 const token=getSessionToken();let remote:ExerciseHistoryEntry[]=[];let failure:unknown;
 try{remote=await apiRequest<ExerciseHistoryEntry[]>(`/workouts/history/${encodeURIComponent(id)}`);}catch(e){failure=e;}
 if(!user||token!==getSessionToken()){if(failure)throw failure;return remote;}
 const local=Object.values((await readWorkouts(user)).sessions).filter(w=>w.snapshot.status==='completed'&&w.snapshot.exercises.some(e=>e.id===id)).map(w=>({sessionId:w.id,startedAt:new Date(w.snapshot.startedAt).toISOString(),endedAt:w.snapshot.endedAt?new Date(w.snapshot.endedAt).toISOString():null,exercise:w.snapshot.exercises.find(e=>e.id===id)!,debrief:w.snapshot.debrief,pain:w.snapshot.debrief.pain||w.snapshot.painReports.length>0}));
 const merged=new Map(remote.map(r=>[r.sessionId,r]));for(const row of local)if(!merged.has(row.sessionId))merged.set(row.sessionId,row);
 if(!merged.size&&failure)throw failure;return [...merged.values()].sort((a,b)=>Date.parse(b.startedAt)-Date.parse(a.startedAt)).slice(0,50);
}
export const blockProgress=(id:string)=>apiRequest<BlockProgress>(`/workouts/blocks/${id}`);
export const extendBlock=(id:string)=>apiRequest(`/workouts/blocks/${id}/extend`,{method:'POST'});
export const listWorkouts=()=>apiRequest<WorkoutRecord[]>('/workouts');
export const newWorkoutId=()=>Crypto.randomUUID();
const flushing=new Set<string>();
export async function queueWorkout(user:string,id:string,snapshot:WorkoutSnapshot){
 await updateWorkouts(user,cache=>{
  const row=cache.sessions[id]??{id,revision:0,snapshot,pending:[]};
  if(row.pending.length>500)throw new Error('Synchronise ta séance avant de continuer.');
  const copy=JSON.parse(JSON.stringify(snapshot)) as WorkoutSnapshot;
  row.pending.push({requestId:Crypto.randomUUID(),revision:row.revision+row.pending.length,snapshot:copy});row.snapshot=copy;cache.sessions[id]=row;
 });
}
export async function syncWorkouts(user:string){
 if(flushing.has(user))return;flushing.add(user);const token=getSessionToken();
 try{
  const ids=Object.keys((await readWorkouts(user)).sessions);
  for(const id of ids){
   while(token && token===getSessionToken()){
    const current=(await readWorkouts(user)).sessions[id],head=current?.pending[0];if(!head)break;
    try{
     const result=await apiRequest<{session:WorkoutRecord;acknowledgedRevision:number}>(`/workouts/${id}`,{method:'PUT',body:head});
     if(token!==getSessionToken())return;
     await updateWorkouts(user,cache=>{const row=cache.sessions[id];if(row.pending[0]?.requestId===head.requestId){row.pending.shift();row.revision=result.acknowledgedRevision;row.error=undefined;}});
    }catch(e){await updateWorkouts(user,c=>{c.sessions[id].error=e instanceof Error?e.message:'Synchronisation impossible.';});if(e instanceof ApiError && e.status===409)break;return;}
   }
  }
 }finally{flushing.delete(user);}
}
export async function restoreWorkout(user:string,workoutId?:string):Promise<LocalWorkout|null>{
 const token=getSessionToken();
 const local=Object.values((await readWorkouts(user)).sessions).filter(s=>s.snapshot.status==='in_progress' && (!workoutId||s.snapshot.workout.id===workoutId)).sort((a,b)=>b.snapshot.startedAt-a.snapshot.startedAt)[0];
 if(local)return local;
 if(!token||token!==getSessionToken())return null;
 try{const remote=(await apiRequest<WorkoutRecord[]>('/workouts/active')).find(s=>s.status==='in_progress'&&(!workoutId||s.snapshot.workout.id===workoutId));if(token!==getSessionToken())return null;if(remote){const saved={id:remote.id,revision:remote.revision,snapshot:remote.snapshot,pending:[]};await updateWorkouts(user,c=>{c.sessions[remote.id]=saved;});return saved;}}catch{/* The local draft remains available offline. */}
 return null;
}
export const workoutSyncState=async(user:string,id:string)=>(await readWorkouts(user)).sessions[id];

export const analyzeWorkout=(id:string)=>apiRequest<WorkoutAnalysis>(`/workouts/${id}/analysis`,{method:'POST',timeoutMs:100000});
export const applyWorkoutAnalysis=(id:string,revision:number)=>apiRequest<WorkoutAnalysis>(`/workouts/${id}/apply-analysis`,{method:'POST',body:{revision}});
