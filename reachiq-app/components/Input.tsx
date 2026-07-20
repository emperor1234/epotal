import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, typography } from '../theme/tokens';

export function Input({
  label,
  icon,
  secure = false,
  rightAdornment,
  style,
  ...props
}: TextInputProps & {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  secure?: boolean;
  rightAdornment?: React.ReactNode;
  style?: ViewStyle;
}) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(secure);

  return (
    <View style={[styles.wrap, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.field, focused && styles.fieldFocused]}>
        {icon && <Ionicons name={icon} size={18} color={colors.outline} style={styles.icon} />}
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.outline}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
        {secure && (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.outline} />
          </Pressable>
        )}
        {rightAdornment}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { ...typography.labelMd, color: colors.onSurface, fontSize: 13, fontWeight: '700' },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.surfaceContainerLowest,
  },
  fieldFocused: {
    borderColor: colors.secondary,
    borderWidth: 1.5,
  },
  icon: { marginRight: -2 },
  input: {
    flex: 1,
    ...typography.bodyLg,
    color: colors.onSurface,
    fontSize: 15,
  },
});
