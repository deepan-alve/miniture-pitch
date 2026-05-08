// Miniture design tokens. Extracted from product screenshots — warm cream
// background, orange accents, pastel category cards, generous rounded shapes.
//
// Used everywhere instead of hardcoded values. If a screen needs a color or
// spacing not in here, add it here first; never reach for a raw hex.

import { Platform } from 'react-native';

export const Palette = {
  bg: '#FAF6F0',
  bgElevated: '#FFFFFF',
  bgSubtle: '#F2EDE5',

  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5C',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  orange: '#E8722C',
  orangeSoft: '#FDE4D3',
  black: '#0F0F0F',

  pastelYellow: '#FEF1C2',
  pastelBlue: '#DDE6FF',
  pastelGreen: '#D8F0DC',
  pastelPeach: '#FFE2CD',
  pastelPink: '#F4D8E8',
  pastelLavender: '#E1DAFF',
  pastelCream: '#FFF4D6',

  bluePrimary: '#3360FF',
  purpleDeep: '#5D4DAD',
  yellowDeep: '#F4B92F',

  success: '#16A34A',
  warning: '#F59E0B',
  danger: '#DC2626',

  border: '#E5E0D7',
  borderStrong: '#C9C2B5',
} as const;

export const PastelDeck = [
  Palette.pastelYellow,
  Palette.pastelBlue,
  Palette.pastelGreen,
  Palette.pastelPeach,
  Palette.pastelPink,
  Palette.pastelLavender,
] as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 56,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  card: 20,
  cardLg: 28,
  pill: 999,
} as const;

export const Typography = {
  caption: 12,
  body: 14,
  bodyLg: 16,
  subhead: 18,
  title: 20,
  heading: 24,
  display: 32,
  hero: 40,

  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Inter', system-ui, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
})!;

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cta: {
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
} as const;

export const Theme = {
  Palette,
  Spacing,
  Radius,
  Typography,
  Fonts,
  Shadows,
  PastelDeck,
} as const;

// Compatibility export — legacy default-template `Colors` shape so the
// shipped `themed-text.tsx` / `themed-view.tsx` keep working while we
// migrate them.
export const Colors = {
  light: {
    text: Palette.textPrimary,
    background: Palette.bg,
    tint: Palette.orange,
    icon: Palette.textSecondary,
    tabIconDefault: Palette.textMuted,
    tabIconSelected: Palette.orange,
  },
  dark: {
    text: Palette.textInverse,
    background: '#1A1814',
    tint: Palette.orange,
    icon: '#A8A39A',
    tabIconDefault: '#A8A39A',
    tabIconSelected: Palette.orange,
  },
} as const;
