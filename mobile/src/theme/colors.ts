export const colors = {
  background: '#f4f4f4',
  surface: '#fefefe',
  primary: '#3199ff',
  accent: '#af58fd',
  energy: '#ff5a3d',
  success: '#0fc68c',
  successSurface: '#e6fbf2',
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
} as const;

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
