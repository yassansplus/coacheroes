import type { WorkoutSnapshot } from './workout.schema';
/** Explicit projection: no account identifiers, name, email, photo or authentication data. */
export function anonymousData<T>(value:T,firstName?:string|null):T {
 const clean=(v:unknown):unknown=>{
  if(typeof v==='string'){
   let result=v.replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g,'[email]');
   if(firstName && firstName!=='toi'){const escaped=firstName.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');result=result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`,'giu'),'[prénom]');}return result;
  }
  if(Array.isArray(v))return v.map(clean);
  if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['firstName','email','userId','appleSubject'].includes(k)).map(([k,val])=>[k,clean(val)]));
  return v;
 };return clean(value) as T;
}
export function workoutAiContext(s:WorkoutSnapshot,firstName?:string|null){return anonymousData({
 date:new Date(s.startedAt).toISOString(),endedAt:s.endedAt?new Date(s.endedAt).toISOString():null,status:s.status,sport:s.workout.sport??s.workout.kind,
 exercises:s.exercises.map(e=>({id:e.id,name:e.name,equipment:e.equipment,minReps:e.minReps,maxReps:e.maxReps,rir:e.rir,sets:e.sets.filter(v=>v!==null).map(v=>({weight:v.weight,reps:v.reps,feeling:v.feeling,warmup:v.warmup,occurredAt:v.occurredAt}))})),
 debrief:s.debrief,painReports:s.painReports.map(p=>({exerciseId:p.exerciseId,zones:p.zones,intensity:p.intensity,timing:p.timing,note:p.note})),sportMetrics:s.sportMetrics,
},firstName);}
