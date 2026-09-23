export const colors = {
  background: '#f4f4f4',
  surface: '#fefefe',
  primary: '#3199ff',
  accent: '#af58fd',
  energy: '#ff5a3d',
  success: '#0fc68c',
  successSurface: '#e6fbf2',
  successText: '#008575',
  energySurface: '#fff0ee',
  text: '#091440',
  textSecondary: '#61739c',
  textMuted: '#8c9bbe',
  border: '#dce5f5',
  primarySurface: '#edf5ff',
  primaryTint: '#e1eeff',
  accentSurface: '#f0edff',
  onboardingBackground: '#f5faff',
  warningSurface: '#fff8ed',
  warning: '#f5aa33',
  white: '#ffffff',
  googleBlue: '#4285f4',
  googleGreen: '#34a853',
  googleYellow: '#fbbc05',
  googleRed: '#ea4335',
  energyVeryLow: '#f45b69',
  energyLow: '#9387c4',
  energyHigh: '#20b6c1',
  squadPurple: '#7254ff',
  squadCoral: '#ff8179',
  squadGreen: '#55c9a2',
  squadGold: '#ffbd32',
  squadOutline: '#aaaee0',
} as const;

export const energyLevelColors = [colors.energyVeryLow, colors.energyLow, colors.primary, colors.energyHigh, colors.success] as const;

export const gradients = {
  primary: [colors.primary, colors.accent],
  emphasizedPrimary: ['#1f8eff', '#6c5df7', colors.accent],
  tabPrimary: [colors.primary, '#6275f7', colors.accent],
  onboarding: ['#f8fcff', '#f1f8ff', '#f8fbff'],
  selection: ['#edf5ff', '#eeebff'],
  decoration: ['#dfeeff', '#efebff'],
} as const;

export const cardHighlightBackgrounds = {
  coral: '#fdf2ee',
  lavender: '#e7e8fd',
  lilac: '#e6e6fe',
} as const;

export const colorPalette = {
  ...colors,
  ...cardHighlightBackgrounds,
} as const;

export type AppColor = keyof typeof colorPalette | (string & {});

export function resolveColor(color: AppColor): string {
  return colorPalette[color as keyof typeof colorPalette] ?? color;
}
