export const colors = {
  background: '#f4f4f4',
  surface: '#fefefe',
  primary: '#3199ff',
  accent: '#af58fd',
  energy: '#ff5a3d',
  success: '#0fc68c',
  successSurface: '#e6fbf2',
} as const;

export const gradients = {
  primary: [colors.primary, colors.accent],
  emphasizedPrimary: ['#1f8eff', '#6c5df7', colors.accent],
  tabPrimary: [colors.primary, '#6275f7', colors.accent],
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
