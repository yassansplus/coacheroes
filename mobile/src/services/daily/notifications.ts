import { AppState, Platform } from 'react-native';
import Constants from 'expo-constants';
import { readDailyCache } from '@/storage/daily';
import { getSessionToken } from '@/storage/session';
import { dailyDate, registerDailyDevice } from './index';

export async function setupDailyNotifications(userId:string,onOpen:()=>void):Promise<()=>void>{
 if(Platform.OS==='web'||Constants.appOwnership==='expo')return ()=>{};
 const session=getSessionToken();
 const Notifications=await import('expo-notifications');
 let alive=true,registering=false;
 Notifications.setNotificationHandler({handleNotification:async(notification)=>{const cache=await readDailyCache(userId);const date=notification.request.content.data?.date;const show=alive&&session===getSessionToken()&&!(cache.status?.date===date&&cache.status?.row?.completed_at);return {shouldShowBanner:show,shouldShowList:show,shouldPlaySound:show,shouldSetBadge:false};}});
 const open=(response:import('expo-notifications').NotificationResponse|null)=>{
  const data=response?.notification.request.content.data;
  if(alive&&session===getSessionToken()&&data?.type==='daily'&&data.date===dailyDate())onOpen();
 };
 const listener=Notifications.addNotificationResponseReceivedListener(open);
 void Notifications.getLastNotificationResponseAsync().then(response=>{open(response);return Notifications.clearLastNotificationResponseAsync();}).catch(()=>undefined);
 const register=async()=>{
  if(registering||!alive||session!==getSessionToken())return;registering=true;
  try{
   if(Platform.OS==='android')await Notifications.setNotificationChannelAsync('daily',{name:'Bilan quotidien',importance:Notifications.AndroidImportance.DEFAULT});
   let permissions=await Notifications.getPermissionsAsync();
   if(!permissions.granted&&permissions.canAskAgain)permissions=await Notifications.requestPermissionsAsync();
   if(!alive||session!==getSessionToken())return;
   if(!permissions.granted){await registerDailyDevice(null);return;}
   const projectId=Constants.expoConfig?.extra?.eas?.projectId??Constants.easConfig?.projectId;
   if(!projectId)return;
   const token=(await Notifications.getExpoPushTokenAsync({projectId})).data;
   if(alive&&session===getSessionToken())await registerDailyDevice(token);
  }catch{/* Register again when the device next returns online. */}finally{registering=false;}
 };
 void register();
 const active=AppState.addEventListener('change',state=>{if(state==='active')void register();});
 return ()=>{alive=false;listener.remove();active.remove();};
}
