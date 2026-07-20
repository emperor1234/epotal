import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { ProfileCard } from '../components/ProfileCard';
import { TopBar } from '../components/TopBar';
import { CONTACTS } from '../data/contacts';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function SearchResultsScreen() {
  const [toastVisible, setToastVisible] = useState(false);

  const showToast = () => {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  };

  return (
    <View style={styles.screen}>
      <TopBar showBack title="Results" credits={540} />

      <View style={styles.controlBar}>
        <View style={styles.filterChip}>
          <Ionicons name="filter" size={16} color={colors.outline} />
          <Text style={styles.filterChipText}>SaaS Founders in United Kingdom</Text>
          <Ionicons name="close" size={14} color={colors.outline} />
        </View>
        <Text style={styles.resultCount}>{CONTACTS.length * 312} results</Text>
      </View>

      <FlatList
        data={CONTACTS}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.elementSpacing }} />}
        renderItem={({ item }) => <ProfileCard contact={item} onReveal={showToast} />}
        ListFooterComponent={
          <View style={styles.footer}>
            <Pressable style={styles.loadMore}>
              <Ionicons name="chevron-down" size={18} color={colors.primary} />
              <Text style={styles.loadMoreText}>Load More Results</Text>
            </Pressable>
            <Text style={styles.footerCaption}>Showing {CONTACTS.length} of {CONTACTS.length * 312} results</Text>
          </View>
        }
      />

      {toastVisible && (
        <View style={styles.toast}>
          <Ionicons name="checkmark-circle" size={18} color="#fff" />
          <Text style={styles.toastText}>Profile Unlocked!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controlBar: {
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterChipText: { ...typography.labelMd, color: colors.onSurface, fontWeight: '600' },
  resultCount: { ...typography.labelSm, color: colors.outline },
  listContent: { padding: spacing.containerMargin, paddingBottom: 40 },
  footer: { alignItems: 'center', gap: 12, paddingTop: 20 },
  loadMore: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.xl,
  },
  loadMoreText: { ...typography.labelMd, fontWeight: '700', color: colors.primary },
  footerCaption: { ...typography.labelMd, color: colors.outline },
  toast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.inverseSurface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.lg,
  },
  toastText: { color: colors.inverseOnSurface, fontWeight: '700' },
});
