import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { ProfileCard } from '../components/ProfileCard';
import { TopBar } from '../components/TopBar';
import { ApiRequestError } from '../config/api';
import { useAuth } from '../context/auth';
import { ApiContact, ApiSearchQuery } from '../data/api-types';
import * as searchesApi from '../data/searches';
import { colors, radius, spacing, typography } from '../theme/tokens';

const POLL_INTERVAL_MS = 2000;

export default function SearchResultsScreen() {
  const { searchId } = useLocalSearchParams<{ searchId: string }>();
  const { withAuth, wallet } = useAuth();

  const [status, setStatus] = useState<ApiSearchQuery['status']>('queued');
  const [contacts, setContacts] = useState<ApiContact[]>([]);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchResults = useCallback(async () => {
    if (!searchId) return;
    try {
      const result = await withAuth((token) => searchesApi.getSearchResults(searchId, token));
      setStatus(result.status);
      setContacts(result.contacts);
      if (result.status === 'completed' || result.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load results.');
      if (pollRef.current) clearInterval(pollRef.current);
    }
  }, [searchId, withAuth]);

  useEffect(() => {
    fetchResults();
    pollRef.current = setInterval(fetchResults, POLL_INTERVAL_MS);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchResults]);

  const isSearching = status === 'queued' || status === 'running';

  return (
    <View style={styles.screen}>
      <TopBar showBack title="Results" credits={wallet?.balance} />

      <View style={styles.controlBar}>
        <View style={styles.filterChip}>
          <Ionicons name="filter" size={16} color={colors.outline} />
          <Text style={styles.filterChipText}>{isSearching ? 'Searching…' : `${contacts.length} results`}</Text>
        </View>
        {isSearching && <ActivityIndicator size="small" color={colors.secondary} />}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      <FlatList
        data={contacts}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.elementSpacing }} />}
        renderItem={({ item }) => <ProfileCard contact={item} />}
        ListEmptyComponent={
          !isSearching && !error ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={28} color={colors.outline} />
              <Text style={styles.emptyText}>No contacts found for these filters yet.</Text>
            </View>
          ) : null
        }
      />
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
  errorBox: { paddingHorizontal: spacing.containerMargin, paddingTop: 12 },
  errorText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  listContent: { padding: spacing.containerMargin, paddingBottom: 40, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyText: { ...typography.bodyMd, color: colors.outline, textAlign: 'center' },
});
