import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
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
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async () => {
    if (!searchId) return;
    try {
      const result = await withAuth((token) => searchesApi.getSearchResults(searchId, token));
      setStatus(result.status);
      setContacts(result.contacts);
      return result.status === 'completed' || result.status === 'failed';
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load results.');
      return true; // stop polling on error rather than retry-storm a failing endpoint
    }
  }, [searchId, withAuth]);

  useEffect(() => {
    let cancelled = false;

    // Self-scheduling loop rather than setInterval: the next poll is only
    // queued after the current one settles, so a slow/stalled request
    // can't cause requests to stack up faster than the server (or the
    // browser's per-domain connection limit) can handle.
    const runPoll = async () => {
      const shouldStop = await fetchResults();
      if (!cancelled && !shouldStop) {
        pollRef.current = setTimeout(runPoll, POLL_INTERVAL_MS);
      }
    };

    runPoll();

    return () => {
      cancelled = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [fetchResults]);

  const isSearching = status === 'queued' || status === 'running';
  const failed = status === 'failed';

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

      {(error || failed) && (
        <View style={styles.errorBox}>
          <View style={styles.errorCopy}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Search could not be completed</Text>
              <Text style={styles.errorText}>{error ?? 'The data sources did not complete this search. Try again or adjust your filters.'}</Text>
            </View>
          </View>
          <Button label="Try again" variant="outline" onPress={() => void fetchResults()} />
        </View>
      )}

      <FlatList
        data={contacts}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.elementSpacing }} />}
        renderItem={({ item }) => <ProfileCard contact={item} />}
        ListEmptyComponent={
          !isSearching && !error && !failed ? (
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
  errorBox: { margin: spacing.containerMargin, padding: 16, gap: 14, borderRadius: radius.lg, backgroundColor: colors.errorContainer },
  errorCopy: { flexDirection: 'row', gap: 10 },
  errorTitle: { ...typography.bodyMd, color: colors.onErrorContainer, fontWeight: '800' },
  errorText: { ...typography.labelMd, color: colors.onErrorContainer, marginTop: 2 },
  listContent: { padding: spacing.containerMargin, paddingBottom: 40, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyText: { ...typography.bodyMd, color: colors.outline, textAlign: 'center' },
});
