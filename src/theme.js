import { Platform } from 'react-native';

export const C = {
  bg: '#f6f5f0',
  surface: '#ffffff',
  surfaceAlt: '#fbfaf7',
  dark: '#1a1a2e',
  ink: '#2b2b3a',
  green: '#2d6a4f',
  greenLt: '#e4f1ea',
  soft: '#7a7567',
  muted: '#eceae3',
  border: '#d8d4cc',
  borderLt: '#e8e5dd',
  white: '#ffffff',
  danger: '#c0392b',
  ph: '#bdb8ad',
};

export const shadow = (level = 1) => ({
  shadowColor: C.dark,
  shadowOpacity: 0.05 + level * 0.025,
  shadowRadius: 8 + level * 8,
  shadowOffset: { width: 0, height: 3 + level * 3 },
  elevation: level * 2 + 1,
});

export const mono = Platform.select({ ios: 'Menlo', android: 'monospace' });

export const F = {
  sans: 'DMSans_400Regular',
  sansMed: 'DMSans_500Medium',
  sansBold: 'DMSans_700Bold',
  mono: 'DMMono_400Regular',
};

export const radii = { sm: 10, md: 14, lg: 20, xl: 28, pill: 999 };
