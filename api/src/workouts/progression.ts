import type { WorkoutSnapshot } from './workout.schema';
/** Conservative double progression; never transposes a load to another exercise. */
export function progression(snapshot:WorkoutSnapshot,history:{snapshot:WorkoutSnapshot}[]){
 const pain=snapshot.debrief.pain||snapshot.painReports.length>0;
 return {reply:pain?'On garde de la marge et on fait le point sur la douleur.':'On avance à partir de tes séries, sans brûler les étapes.',recommendations:snapshot.exercises.map(e=>{
  const sets=e.sets.filter(v=>v&&!v.warmup),last=sets.at(-1),base=last?.weight??0;
  const recent=history.filter(w=>w.snapshot.exercises.some(x=>x.id===e.id)).slice(0,2);
  const easy=sets.length>0&&sets.every(v=>v!.feeling==='easy');
  const hard=sets.some(v=>v!.feeling==='hard'||v!.feeling==='failure');
  const consistent=recent.length===2&&recent.every(w=>!w.snapshot.debrief.pain&&!w.snapshot.painReports.length&&w.snapshot.exercises.find(x=>x.id===e.id)!.sets.filter(v=>v&&!v.warmup).length>0&&w.snapshot.exercises.find(x=>x.id===e.id)!.sets.filter(v=>v&&!v.warmup).every(v=>v!.feeling==='easy'&&v!.reps>=e.maxReps));
  // Available equipment increments are unknown, so progress repetitions instead of inventing a load increment.
  return {exerciseId:e.id,weight:base,targetReps:Math.min(e.maxReps,Math.max(e.minReps,pain||hard?e.minReps:(last?.reps??e.minReps)+(easy?1:0))),reason:!last?'Charge à calibrer : aucune série de travail enregistrée.':pain?'Pas de hausse tant que la douleur reste à clarifier.':hard?'On consolide avec cette charge et davantage de marge.':consistent?'Haut de fourchette confirmé : conserve la charge, ajuste seulement avec un incrément disponible.':'Conserve cette charge et stabilise tes répétitions.'};
 })};
}
