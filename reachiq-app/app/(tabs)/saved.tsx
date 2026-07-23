import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ProfileCard } from '../../components/ProfileCard';
import { TopBar } from '../../components/TopBar';
import { useAuth } from '../../context/auth';
import { colors, spacing, typography } from '../../theme/tokens';
import { ApiContact } from '../../data/api-types';
import { listSaved } from '../../data/savedContacts';

export default function SavedScreen() {
  const { wallet } = useAuth();
  const [contacts, setContacts] = useState<ApiContact[]>([]);

  useFocusEffect(
    useCallback(() => {
      listSaved().then(setContacts);
    }, []),
  );

  return (
    <View style={styles.screen}>
      <TopBar title="Saved" credits={wallet?.balance} />
      <FlatList
        data={contacts}
        keyExtractor={(contact) => contact.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ height: spacing.stackGap }} />}
        renderItem={({ item }) => (
          <ProfileCard
            contact={item}
            onSavedChange={(saved) => {
              if (!saved) setContacts((current) => current.filter((contact) => contact.id !== item.id));
            }}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><Ionicons name="bookmark-outline" size={30} color={colors.secondary} /></View>
            <Text style={styles.emptyTitle}>Your shortlist is empty</Text>
            <Text style={styles.emptyText}>Save promising contacts from search results to keep them close.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { flexGrow: 1, padding: spacing.containerMargin },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: spacing.containerMargin },
  emptyIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  emptyTitle: { ...typography.headlineMd, color: colors.primary, fontWeight: '800' },
  emptyText: { ...typography.bodyMd, color: colors.outline, textAlign: 'center' },
});
