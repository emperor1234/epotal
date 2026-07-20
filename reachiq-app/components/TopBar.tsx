import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

export function TopBar({
  title = 'ReachIQ',
  credits,
  showBack = false,
}: {
  title?: string;
  credits?: number;
  showBack?: boolean;
}) {
  const router = useRouter();
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        {showBack ? (
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.primary} />
          </Pressable>
        ) : (
          <Ionicons name="git-network" size={20} color={colors.primary} />
        )}
        <Text style={styles.title}>{title}</Text>
      </View>
      {credits !== undefined && (
        <View style={styles.creditPill}>
          <Ionicons name="pricetag" size={14} color={colors.onPrimaryContainer} />
          <Text style={styles.creditText}>{credits} Credits</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { ...typography.headlineMd, color: colors.primary, fontWeight: '800' },
  creditPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  creditText: { color: colors.onPrimaryContainer, fontSize: 12, fontWeight: '700' },
});
