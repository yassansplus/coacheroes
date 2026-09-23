import { createContext, useCallback, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { usePathname, useRootNavigationState, useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { useSession } from './SessionProvider';
import { readDailyCache, updateDailyCache } from '@/storage/daily';
import { dailyDate, dailyTimezone, loadDaily, markDailyOpened, saveDaily, type DailyData, type DailyProposal, type DailyStatus, type DailyWrite } from '@/services/daily';
import { updateHomeSummary } from '@/store/homeSummary';
import { setupDailyNotifications } from '@/services/daily/notifications';

type Context = { status:DailyStatus|null;draft:DailyData|null;loading:boolean;error:string|null;busy:boolean;refresh:()=>Promise<void>;saveDraft:(data:DailyData)=>Promise<void>;complete:(data:DailyData,decision:'none'|'accepted'|'declined',proposal:DailyProposal|null)=>Promise<boolean> };
const DailyContext=createContext<Context|null>(null);
export function DailyProvider({children}:PropsWithChildren){
 const {user}=useSession();const owner=user?.onboardingCompleted?user.id:null;
 const [status,setStatus]=useState<DailyStatus|null>(null),[draft,setDraft]=useState<DailyData|null>(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
 const account=useRef(owner);account.current=owner;
 const syncing=useRef<string|null>(null),saving=useRef(false),opening=useRef(false),epoch=useRef(0);
 const currentHour=new Date().getHours();
 const router=useRouter(),pathname=usePathname(),navigation=useRootNavigationState();
 const refresh=useCallback(async()=>{
  if(!owner||syncing.current===owner||saving.current)return;syncing.current=owner;const version=epoch.current;
  try{
   const cache=await readDailyCache(owner);if(account.current!==owner||epoch.current!==version)return;
   const date=dailyDate();setDraft(cache.days[date]?.draft??null);
   if(cache.status?.date===date)setStatus(cache.status);
   else {
    const history=cache.status?.history??[];
    const previous=history.filter(row=>row.date<date).at(-1);
    setStatus({date,timezone:dailyTimezone(),row:null,reference:previous?{weight:previous.weight,date:previous.date}:cache.status?.reference??null,history,shouldOpen:new Date().getHours()>=7});
   }
   const next=await loadDaily();if(account.current!==owner||epoch.current!==version)return;
   await updateDailyCache(owner,c=>{c.status=next;});
   if(account.current!==owner||epoch.current!==version)return;
   setStatus(next);setError(null);
   if(cache.days[next.date]?.opened&&!next.row?.opened_at&&!next.row?.completed_at&&new Date().getHours()>=7)void markDailyOpened().catch(()=>undefined);
   if(next.row?.completed_at&&next.row.data)updateHomeSummary({sleepMinutes:next.row.data.sleepMinutes,energy:next.row.data.energy,checkedIn:true});
   else updateHomeSummary({checkedIn:false});
  }catch(e){if(account.current===owner)setError(e instanceof Error?e.message:'Impossible de charger le bilan.');}
  finally{if(syncing.current===owner)syncing.current=null;if(account.current===owner)setLoading(false);}
 },[owner]);
 useEffect(()=>{setStatus(null);setDraft(null);setError(null);setLoading(!!owner);epoch.current++;saving.current=false;setBusy(false);opening.current=false;if(!owner)return;void refresh();const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},60000);const listener=AppState.addEventListener('change',state=>{if(state==='active')void refresh();});return()=>{clearInterval(timer);listener.remove();};},[owner,refresh]);
 useEffect(()=>{if(owner&&pathname==='/')void refresh();},[pathname,owner,refresh]);
 useEffect(()=>{
  if(!owner||!navigation?.key||loading||opening.current||status?.date!==dailyDate()||currentHour<7||status.row?.completed_at)return;
  if(!['/','/today','/nutrition','/profile','/progression','/game','/squad','/coach'].includes(pathname))return;
  opening.current=true;let alive=true;
  void (async()=>{
   const cache=await readDailyCache(owner);
   if(cache.days[status.date]?.opened||status.row?.opened_at)return;
   if(!alive||account.current!==owner)return;
   await updateDailyCache(owner,c=>{c.days[status.date]={...c.days[status.date],opened:true};});
   let open=true;if(!error)try{open=(await markDailyOpened()).open;}catch{/* Local flag prevents repeated openings offline. */}
   if(open&&alive&&account.current===owner&&pathname!=='/today')router.push('/today');
  })().catch(()=>undefined).finally(()=>{opening.current=false;});
  return()=>{alive=false;};
 },[owner,navigation?.key,loading,currentHour,status?.date,status?.row?.opened_at,status?.row?.completed_at,pathname,router]);
 useEffect(()=>{if(!owner)return;let cleanup:undefined|(()=>void),alive=true;void setupDailyNotifications(owner,()=>{if(account.current===owner)router.push('/today');}).then(stop=>{if(alive)cleanup=stop;else stop();}).catch(()=>undefined);return()=>{alive=false;cleanup?.();};},[owner,router]);
 const saveDraft=useCallback(async(data:DailyData)=>{if(!owner)return;const date=dailyDate();await updateDailyCache(owner,c=>{c.days[date]={...c.days[date],draft:data};});if(account.current===owner)setDraft(data);},[owner]);
 const complete=useCallback(async(data:DailyData,decision:'none'|'accepted'|'declined',proposal:DailyProposal|null)=>{
  if(!owner||!status||saving.current)return false;saving.current=true;epoch.current++;setBusy(true);setError(null);
  try{
   if(status.date!==dailyDate())throw new Error('Le jour a changé. Recharge ton bilan.');
   const cache=await readDailyCache(owner);
   const base={date:status.date,timezone:dailyTimezone(),revision:status.row?.revision??0,data,adjustment:decision,proposalId:proposal?.id??null};
   const pending=cache.days[status.date]?.pending;
   const {requestId:oldId,...oldBase}=pending??{};
   const body:DailyWrite={...base,requestId:oldId&&JSON.stringify(oldBase)===JSON.stringify(base)?oldId:Crypto.randomUUID()};
   await updateDailyCache(owner,c=>{c.days[status.date]={...c.days[status.date],draft:data,pending:body};});
   const row=await saveDaily(body);if(account.current!==owner)return false;
   const history=status.history.filter(h=>h.date!==status.date);if(data.weightKg!==null)history.push({date:status.date,weight:data.weightKg});
   const next={...status,row,history:history.sort((a,b)=>a.date.localeCompare(b.date)),shouldOpen:false};
   await updateDailyCache(owner,c=>{c.status=next;c.days[status.date]={opened:true,draft:data};});
   setStatus(next);updateHomeSummary({sleepMinutes:data.sleepMinutes,energy:data.energy,checkedIn:true});return true;
  }catch(e){if(account.current===owner)setError(`${e instanceof Error?e.message:'Bilan non envoyé.'} Tes réponses restent sur cet appareil. Réessaie pour valider.`);return false;}
  finally{saving.current=false;if(account.current===owner)setBusy(false);}
 },[owner,status]);
 return <DailyContext.Provider value={{status,draft,loading,error,busy,refresh,saveDraft,complete}}>{children}</DailyContext.Provider>;
}
export function useDaily(){const value=useContext(DailyContext);if(!value)throw new Error('DailyProvider missing');return value;}
