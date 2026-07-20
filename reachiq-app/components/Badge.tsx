import { StyleSheet, Text, View } from 'react-native';
import { colors, radius } from '../theme/tokens';

type Tone = 'verified' | 'catchAll' | 'credit' | 'neutral';

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: Tone; icon?: React.ReactNode }) {
  const palette = tones[tone];
  return (
    <View style={[styles.base, { backgroundColor: palette.bg }]}>
      {icon}
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const tones: Record<Tone, { bg: string; fg: string }> = {
  verified: { bg: '#D1FAE5', fg: '#047857' },
  catchAll: { bg: colors.amberBg, fg: colors.amberText },
  credit: { bg: colors.inverseSurface, fg: colors.inverseOnSurface },
  neutral: { bg: colors.surfaceContainer, fg: colors.onSurfaceVariant },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
});
