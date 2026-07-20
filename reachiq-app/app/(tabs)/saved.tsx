import { Ionicons } from '@expo/vector-icons';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { ProfileCard } from '../../components/ProfileCard';
import { TopBar } from '../../components/TopBar';
import { CONTACTS } from '../../data/contacts';
import { colors, spacing, typography } from '../../theme/tokens';

const SAVED = CONTACTS.slice(0, 2);

export default function SavedScreen() {
  return (
    <View style={styles.screen}>
      <TopBar title="Saved" credits={540} />
      {SAVED.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="bookmark-outline" size={32} color={colors.outline} />
          <Text style={styles.emptyText}>No saved contacts yet</Text>
        </View>
      ) : (
        <FlatList
          data={SAVED}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.content}
          ItemSeparatorComponent={() => <View style={{ height: spacing.elementSpacing }} />}
          renderItem={({ item }) => <ProfileCard contact={item} />}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.containerMargin, paddingBottom: 40 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyText: { ...typography.bodyMd, color: colors.outline },
});
