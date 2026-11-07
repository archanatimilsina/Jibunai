import { Platform } from 'react-native';

export const C = {
  bg: '#f6f5f0',
  surface: '#ffffff',
  surfaceAlt: '#efede4',
  dark: '#1a1a2e',
  ink: '#1a1a2e',
  green: '#2d6a4f',
  greenDark: '#245741',
  greenLt: '#e4f1ea',
  soft: '#5c574c',
  muted: '#eceae3',
  border: '#d8d4cc',
  borderLt: '#e8e5dd',
  white: '#ffffff',
  danger: '#c0392b',
  ph: '#6b665b',
};

/** DESIGN.md tokens — single source of truth for the UI-only redesign. Mirrors the front matter in DESIGN.md. Logic reads C/F/radii/shadow; new code should read TOKENS. */
export const TOKENS = {
  colors: {
    primary: '#2D6A4F',
    primaryDark: '#245741',
    secondary: '#1A1A2E',
    tertiary: '#E4F1EA',
    neutral: '#5C574C',
    surface: '#FFFFFF',
    surfaceAlt: '#EFEDE4',
    onSurface: '#1A1A2E',
    onPrimary: '#FFFFFF',
    onSecondary: '#FFFFFF',
    onTertiary: '#1A1A2E',
    error: '#C0392B',
    onError: '#FFFFFF',
    success: '#2D6A4F',
    onSuccess: '#FFFFFF',
    border: '#D8D4CC',
    muted: '#ECEAE3',
  },
  spacing: { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 },
};

export const shadow = (level = 1) => ({
  shadowColor: C.dark,
  shadowOpacity: 0.05 + level * 0.025,
  shadowRadius: 8 + level * 8,
  shadowOffset: { width: 0, height: 3 + level * 3 },
  elevation: level * 2 + 1,
});

export const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

export const F = {
  sans: 'DMSans_400Regular',
  sansMed: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
  mono: 'DMMono_400Regular',
};

export const radii = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
