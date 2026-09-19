import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { colors, resolveColor, type AppColor } from '@/theme/colors';

export type SymbolName = 'arrow' | 'back' | 'check' | 'plus' | 'minus' | 'search' | 'edit' |
  'info' | 'close' | 'chevron' | 'clock' | 'more' | 'camera' | 'lock' | 'warning' | 'apple' | 'google';

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
    arrow: 'M4 12h15M13 5l7 7-7 7', back: 'm15 4-8 8 8 8', check: 'm5 12 4.5 4.5L19 7',
    plus: 'M12 4v16M4 12h16', minus: 'M4 12h16', search: 'm16 16 5 5',
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
