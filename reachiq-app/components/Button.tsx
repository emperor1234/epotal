import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../theme/tokens';

type Variant = 'primary' | 'secondary' | 'dark' | 'outline' | 'ghost';

export function Button({
  label,
  onPress,
  variant = 'secondary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const palette = variantStyles[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border, borderWidth: palette.border ? 1 : 0 },
        pressed && !isDisabled && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        isDisabled && { opacity: 0.5 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon && iconPosition === 'left' && <Ionicons name={icon} size={18} color={palette.fg} />}
          <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
          {icon && iconPosition === 'right' && <Ionicons name={icon} size={18} color={palette.fg} />}
        </>
      )}
    </Pressable>
  );
}

const variantStyles: Record<Variant, { bg: string; fg: string; border?: string }> = {
  primary: { bg: colors.primary, fg: colors.onPrimary },
  secondary: { bg: colors.secondary, fg: colors.onSecondary },
  dark: { bg: colors.inverseSurface, fg: colors.inverseOnSurface },
  outline: { bg: 'transparent', fg: colors.onSurface, border: colors.outlineVariant },
  ghost: { bg: 'transparent', fg: colors.error },
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    minHeight: 52,
    paddingHorizontal: 20,
    borderRadius: radius.md,
  },
  label: {
    ...typography.labelMd,
    fontSize: 15,
    fontWeight: '700',
  },
});
