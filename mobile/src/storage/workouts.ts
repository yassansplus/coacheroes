import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';
import type { WorkoutSnapshot } from '@/services/workouts/types';
export type PendingWrite={requestId:string;revision:number;snapshot:WorkoutSnapshot};
export type LocalWorkout={id:string;revision:number;snapshot:WorkoutSnapshot;pending:PendingWrite[];error?:string};
type Cache={sequence:number;sessions:Record<string,LocalWorkout>};
const locks=new Map<string,Promise<unknown>>();
const memory=new Map<string,Cache>();
const loading=new Map<string,Promise<Cache>>();
const key=(user:string,slot:number)=>`workouts-v1-${user}-${slot}`;
const path=(user:string,slot:number)=>`${FileSystem.documentDirectory}${key(user,slot)}.json`;
export function readWorkouts(user:string):Promise<Cache>{
 if(memory.has(user))return Promise.resolve(memory.get(user)!);
 if(loading.has(user))return loading.get(user)!;
 const pending=loadWorkouts(user).finally(()=>loading.delete(user));loading.set(user,pending);return pending;
}
async function loadWorkouts(user:string):Promise<Cache>{
 if(memory.has(user))return memory.get(user)!;
 const candidates=await Promise.all([0,1].map(async slot=>{try{const raw=Platform.OS==='web'?localStorage.getItem(key(user,slot)):await FileSystem.readAsStringAsync(path(user,slot));const value=JSON.parse(raw??'null');return value&&Number.isInteger(value.sequence)&&value.sessions?value as Cache:null;}catch{return null;}}));
 const value=candidates.filter((c):c is Cache=>!!c).sort((a,b)=>b.sequence-a.sequence)[0]??{sequence:0,sessions:{}};memory.set(user,value);return value;
}
export function updateWorkouts(user:string,change:(cache:Cache)=>void):Promise<void>{
 const next=(locks.get(user)??Promise.resolve()).catch(()=>{}).then(async()=>{
  const value=JSON.parse(JSON.stringify(await readWorkouts(user))) as Cache;change(value);value.sequence++;
  const raw=JSON.stringify(value),slot=value.sequence%2;
  if(Platform.OS==='web')localStorage.setItem(key(user,slot),raw);else await FileSystem.writeAsStringAsync(path(user,slot),raw);
  memory.set(user,value);
 });locks.set(user,next);return next;
}
