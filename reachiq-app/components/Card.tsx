import { Platform, StyleSheet, View, ViewProps } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

export function Card({ style, ...props }: ViewProps) {
  return <View style={[styles.card, style]} {...props} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    padding: spacing.cardPadding,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 8px 24px rgba(11, 18, 32, 0.06)' }
      : {
          shadowColor: '#0b1220',
          shadowOpacity: 0.06,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 8 },
          elevation: 2,
        }),
  },
});
