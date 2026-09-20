import type { StyleProp, ViewStyle } from 'react-native';

import { BottomTabBar } from '@/components/BottomTabBar';
import { Symbol, type SymbolName } from '@/components/Symbol';

export type AppNavTab = 'today' | 'program' | 'coach' | 'progress' | 'profile';

export type AppNavbarProps = {
  value: AppNavTab;
  onChange: (tab: AppNavTab) => void;
  style?: StyleProp<ViewStyle>;
  includeCoach?: boolean;
};

const tabs: readonly { value: AppNavTab; label: string; icon: SymbolName }[] = [
  { value: 'today', label: 'Aujourd’hui', icon: 'home' },
  { value: 'program', label: 'Programme', icon: 'dumbbell' },
  { value: 'progress', label: 'Progression', icon: 'chart' },
  { value: 'profile', label: 'Profil', icon: 'user' },
];

/** Shared app navigation; the parent retains responsibility for routing. */
export function AppNavbar({ value, onChange, style, includeCoach = false }: AppNavbarProps) {
  const visibleTabs = includeCoach ? [...tabs.slice(0, 2), { value: 'coach' as const, label: 'Coach', icon: 'sparkles' as const }, ...tabs.slice(2)] : tabs;
  return <BottomTabBar<AppNavTab>
    highlightActiveTab
    value={value}
    onChange={onChange}
    style={style}
    items={visibleTabs.map(tab => ({
      value: tab.value,
      label: tab.label,
      icon: <Symbol name={tab.icon} color={tab.value === value ? 'primary' : 'textMuted'} />,
    }))}
  />;
}
