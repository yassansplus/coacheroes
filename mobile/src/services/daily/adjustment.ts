import type { Workout, Exercise } from '@/services/workouts/types';
import type { DailyProposal } from './index';
export function applyDailyAdjustment(workout:Workout,exercises:Exercise[],proposal:DailyProposal|null|undefined,date:string){
 if(!proposal?.id||proposal.date!==date||workout.programVersionId!==proposal.programVersionId||workout.sessionIndex!==proposal.sessionIndex)return null;
 if(workout.scheduledDate?workout.scheduledDate!==date:workout.day!==new Date(`${date}T12:00:00`).getDay())return null;
 if(exercises.some(e=>e.sets.some(Boolean)))return null;
 const next=exercises.map(e=>{const change=proposal.exercises.find(c=>c.exerciseId===e.id);return change?{...e,sets:e.sets.slice(0,change.sets),rir:Math.max(e.rir??0,change.rir)}:e;});
 const originalSets=exercises.reduce((n,e)=>n+e.sets.length,0),sets=next.reduce((n,e)=>n+e.sets.length,0),warmup=workout.warmupMinutes??5;
 const minutes=proposal.blocks?.length?warmup+proposal.blocks.reduce((n,b)=>n+b.minutes,0):Math.ceil(warmup+Math.max(0,workout.minutes-warmup)*(originalSets?sets/originalSets:1));
 return {workout:{...workout,minutes,scheduledDate:date,...(proposal.blocks?{sportBlocks:proposal.blocks}:{})},exercises:next};
}
