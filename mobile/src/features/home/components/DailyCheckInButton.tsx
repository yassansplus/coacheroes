import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, View } from 'react-native';
import { IconButton } from '@/components/IconButton';
import { Symbol } from '@/components/Symbol';
import { colors } from '@/theme/colors';

export function DailyCheckInButton({onPress}:{onPress:()=>void}){
 const glow=useRef(new Animated.Value(0)).current;
 useEffect(()=>{
  let animation:Animated.CompositeAnimation|undefined,alive=true,changed=false;
  const configure=(reduced:boolean)=>{animation?.stop();glow.setValue(0);if(!reduced&&alive){animation=Animated.loop(Animated.sequence([Animated.timing(glow,{toValue:1,duration:1400,useNativeDriver:true}),Animated.timing(glow,{toValue:0,duration:1400,useNativeDriver:true})]));animation.start();}};
  void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(!changed&&alive)configure(value);}).catch(()=>undefined);
  const listener=AccessibilityInfo.addEventListener('reduceMotionChanged',value=>{changed=true;configure(value);});
  return()=>{alive=false;animation?.stop();listener.remove();};
 },[glow]);
 return <View style={{width:48,height:48}}><Animated.View pointerEvents="none" style={{position:'absolute',inset:-4,borderRadius:28,backgroundColor:colors.primary,opacity:glow.interpolate({inputRange:[0,1],outputRange:[0.04,0.22]}),transform:[{scale:glow.interpolate({inputRange:[0,1],outputRange:[1,1.03]})}]}}/><IconButton accessibilityLabel="Faire mon bilan" onPress={onPress} variant="outline" size={48} icon={<Symbol name="calendar" color="primary" size={23}/>} /></View>;
}
