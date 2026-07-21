import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { TopBar } from '../../components/TopBar';
import { useAuth } from '../../context/auth';
import { colors, spacing, typography } from '../../theme/tokens';

// The backend doesn't have a saved-contacts endpoint yet (SYSTEM_DESIGN.md
// has no Bookmark/SavedContact model) — this tab is a placeholder until
// that's added. The bookmark icon on ProfileCard is decorative for now.
export default function SavedScreen() {
  const { wallet } = useAuth();

  return (
    <View style={styles.screen}>
      <TopBar title="Saved" credits={wallet?.balance} />
      <View style={styles.empty}>
        <Ionicons name="bookmark-outline" size={32} color={colors.outline} />
        <Text style={styles.emptyText}>Saved contacts are coming soon.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: spacing.containerMargin },
  emptyText: { ...typography.bodyMd, color: colors.outline, textAlign: 'center' },
});
