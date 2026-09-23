import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, resolveColor, type AppColor } from '@/theme/colors';

export type SymbolName = 'arrow' | 'back' | 'check' | 'plus' | 'minus' | 'search' | 'barcode' | 'edit' |
  'info' | 'close' | 'chevron' | 'clock' | 'more' | 'camera' | 'lock' | 'warning' | 'apple' | 'google' | 'waist' | 'chest' | 'arm' | 'thigh' | 'users' | 'sparkles' | 'settings' |
  'home' | 'clipboard' | 'dumbbell' | 'chart' | 'user' | 'bell' | 'calendar' | 'layers' | 'list' | 'flash' | 'image' | 'flip' | 'history' | 'send' | 'attachment' | 'microphone' | 'battery' | 'target' | 'eye' | 'robot' | 'heart' | 'shield' | 'download';

type SymbolProps = { name: SymbolName; size?: number; color?: AppColor };

/** Small interface glyphs; illustrated content uses the project's raster assets. */
export function Symbol({ name, size = 22, color = 'text' }: SymbolProps) {
  const stroke = resolveColor(color);
  if (name === 'google') return <Svg width={size} height={size} viewBox="0 0 48 48">
    <Path fill={colors.googleYellow} d="M43.6 20H24v8h11.3A12 12 0 1 1 32.9 14l5.7-5.7A20 20 0 1 0 44 24c0-1.4-.1-2.7-.4-4Z" />
    <Path fill={colors.googleRed} d="m6.3 14.7 6.6 4.8A12 12 0 0 1 32.9 14l5.7-5.7A20 20 0 0 0 6.3 14.7Z" />
    <Path fill={colors.googleGreen} d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.3a12 12 0 0 1-18.5-5.4l-6.6 5.1A20 20 0 0 0 24 44Z" />
    <Path fill={colors.googleBlue} d="M43.6 20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.2 5.3A19.9 19.9 0 0 0 44 24c0-1.4-.1-2.7-.4-4Z" />
  </Svg>;
  if (name === 'apple') return <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path fill={stroke} d="M17.1 12.5c0-2 1.6-3 1.7-3.1-1-1.5-2.6-1.7-3.1-1.7-1.3-.2-2.6.8-3.3.8-.7 0-1.8-.8-2.9-.8-1.5 0-2.9.9-3.7 2.2-1.6 2.8-.4 6.9 1.1 9.1.7 1 1.5 2.1 2.7 2 .9 0 1.4-.6 2.8-.6 1.3 0 1.8.6 2.9.6 1.2 0 1.9-1 2.6-2 .8-1.2 1.2-2.4 1.2-2.5-.1 0-2-.8-2-4ZM15.2 6.2c.6-.8 1.1-1.9 1-3-1 .1-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.5 2.8-1.4Z" />
  </Svg>;
  const paths: Partial<Record<SymbolName, string>> = {
    settings: 'm9 2-1 3-3 1-2 3 2 3-2 3 2 3 3 1 1 3h6l1-3 3-1 2-3-2-3 2-3-2-3-3-1-1-3ZM8 12a4 4 0 1 0 8 0 4 4 0 0 0-8 0',
    heart: 'M12 21 3 12C-3 5 6-1 12 6c6-7 15-1 9 6Z',
    shield: 'M12 2 3 6v6c0 5 5 8 9 10 4-2 9-5 9-10V6ZM12 2v20',
    download: 'M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5',
    sparkles: 'm9 3 2.5 6.5L18 12l-6.5 2.5L9 21l-2.5-6.5L0 12l6.5-2.5ZM20 1v6M17 4h6M20 17v6M17 20h6',
    users: 'M9 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0M5 21v-3a7 7 0 0 1 14 0v3ZM4 5a3 3 0 0 0 0 6M20 5a3 3 0 0 1 0 6M2 14q-2 2-1 6h2M22 14q2 2 1 6h-2',
    waist: 'M7 2c3 7 1 11 0 20M17 2c-3 7-1 11 0 20M1 12h5m-2-2 2 2-2 2M23 12h-5m2-2-2 2 2 2M10 12h1m2 0h1',
    chest: 'M8 2v3L4 7Q2 8 2 12v10M16 2v3l4 2q2 1 2 5v10M6 11l1 11M18 11l-1 11M9 12q3 3 6 0M12 15v5',
    arm: 'M21 17q-2-6-8-3l-4 2 2-8 3 1 1-3-3-3-3 2-6 13q0 3 6 3l7-1 4 2M10 10l3 1',
    thigh: 'M6 2h12q4 8 1 20M6 2Q2 10 5 22M9 22l3-12 3 12M12 10l2-2',
    history: 'M3 11a9 9 0 1 1 2 7M3 5v6h6M12 7v6l4 2',
    send: 'm3 3 19 9-19 9 4-9Zm4 9h15',
    attachment: 'm8 13 7-7a3 3 0 0 1 4 4L9 20a5 5 0 0 1-7-7L13 2M5 15l10-10',
    microphone: 'M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0ZM5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8',
    battery: 'M2 6h17v12H2ZM21 10v4M5 9h7v6H5Z',
    target: 'M19 12a7 7 0 1 1-7-7M12 9a3 3 0 1 0 3 3M12 12l9-9M17 3h4v4',
    eye: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Zm10-3a3 3 0 1 0 0 6 3 3 0 0 0 0-6',
    robot: 'M4 7h16v13H4ZM12 3v4M9 11v3M15 11v3M9 17h6M1 11v5M23 11v5',
    flash: 'm13 2-9 12h7l-1 8 10-13h-7Z',
    image: 'M3 3h18v18H3ZM3 17l6-6 4 4 3-3 5 5M7 7h.01',
    flip: 'M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5',
    home: 'm3 10 9-7 9 7v11h-6v-7H9v7H3Z',
    clipboard: 'M9 4H5v17h14V4h-4M9 2h6v5H9ZM8 11h8M8 15h8',
    dumbbell: 'M2 9v6M5 6v12M19 6v12M22 9v6M5 12h14',
    chart: 'M5 14v7M12 8v13M19 3v18',
    user: 'M4 21v-2a8 8 0 0 1 16 0v2ZM12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8',
    bell: 'M5 10a7 7 0 0 1 14 0v5l2 3H3l2-3ZM10 21h4M12 1v2',
    calendar: 'M3 5h18v16H3ZM3 10h18M7 2v5M17 2v5',
    layers: 'm3 7 9-5 9 5-9 5ZM3 12l9 5 9-5M3 17l9 5 9-5',
    list: 'M9 6h12M9 12h12M9 18h12M3 6h1M3 12h1M3 18h1',
    arrow: 'M4 12h15M13 5l7 7-7 7', back: 'm15 4-8 8 8 8', check: 'm5 12 4.5 4.5L19 7',
    plus: 'M12 4v16M4 12h16', minus: 'M4 12h16', search: 'm16 16 5 5',
    barcode: 'M2 5v14M5 5v14M8 5v14M11 5v14M14 5v14M17 5v14M20 5v14M22 5v14',
    edit: 'm14 5 5 5M4 20l5-1L20 8a2.1 2.1 0 0 0-4-4L5 15l-1 5Z',
    info: 'M12 11v6M12 7v.1', close: 'm6 6 12 12M6 18 18 6', chevron: 'm9 5 7 7-7 7',
    clock: 'M12 6v6l4 2', camera: 'M4 7h3l2-3h6l2 3h3v13H4Z',
    lock: 'M7 10V7a5 5 0 0 1 10 0v3M12 14v3', warning: 'm12 3 10 17H2L12 3ZM12 9v4M12 16v.1',
  };
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
    {paths[name] ? <Path d={paths[name]} /> : null}
    {name === 'search' ? <Circle cx="10.5" cy="10.5" r="7.5" /> : null}
    {name === 'info' || name === 'clock' ? <Circle cx="12" cy="12" r="9.5" /> : null}
    {name === 'camera' ? <Circle cx="12" cy="13" r="4" /> : null}
    {name === 'lock' ? <Rect x="4" y="10" width="16" height="12" rx="2" /> : null}
    {name === 'more' ? [5, 12, 19].map(cx => <Circle key={cx} cx={cx} cy="12" r="1" fill={stroke} />) : null}
  </Svg>;
}
