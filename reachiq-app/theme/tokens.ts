// Design tokens ported from stitch_direct_outreach_lead_finder/reachiq/DESIGN.md

export const colors = {
  surface: '#f8fafc',
  surfaceDim: '#d8dadc',
  surfaceBright: '#f7f9fb',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f1f5f9',
  surfaceContainer: '#eaf0f6',
  surfaceContainerHigh: '#dfe7f0',
  surfaceContainerHighest: '#e0e3e5',
  onSurface: '#191c1e',
  onSurfaceVariant: '#45464d',
  inverseSurface: '#2d3133',
  inverseOnSurface: '#eff1f3',
  outline: '#64748b',
  outlineVariant: '#dbe3ec',

  primary: '#0b1220',
  onPrimary: '#ffffff',
  primaryContainer: '#e8f0ff',
  onPrimaryContainer: '#164e9b',

  secondary: '#2563eb',
  onSecondary: '#ffffff',
  secondaryContainer: '#2170e4',
  onSecondaryContainer: '#fefcff',

  tertiary: '#000000',
  onTertiary: '#ffffff',
  tertiaryContainer: '#002113',
  onTertiaryContainer: '#009668',

  error: '#ba1a1a',
  onError: '#ffffff',
  errorContainer: '#ffdad6',
  onErrorContainer: '#93000a',

  background: '#f4f7fb',
  onBackground: '#191c1e',
  surfaceVariant: '#e0e3e5',

  // Product accents (from DESIGN.md prose section)
  deepNavy: '#0b1220',
  electricBlue: '#3B82F6',
  emerald: '#10B981',
  amber: '#F59E0B',
  amberBg: '#FEF3C7',
  amberText: '#B45309',
  border: '#E2E8F0',
} as const;

export const typography = {
  headlineLg: { fontSize: 24, fontWeight: '700' as const, lineHeight: 32, letterSpacing: -0.4 },
  headlineLgMobile: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28, letterSpacing: -0.3 },
  headlineMd: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24, letterSpacing: -0.2 },
  bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  bodyMd: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  labelMd: { fontSize: 12, fontWeight: '600' as const, lineHeight: 16, letterSpacing: 0.2 },
  labelSm: { fontSize: 11, fontWeight: '500' as const, lineHeight: 14 },
} as const;

export const radius = {
  sm: 6,
  DEFAULT: 8,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const spacing = {
  containerMargin: 20,
  stackGap: 12,
  cardPadding: 20,
  elementSpacing: 8,
  sectionGap: 24,
} as const;
