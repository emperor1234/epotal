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
  const [stopping, setStopping] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stopRequestedRef = useRef(false);

  const fetchResults = useCallback(async () => {
    if (!searchId) return;
    setError(null);
    try {
      const result = await withAuth((token) => searchesApi.getSearchResults(searchId, token));
      setStatus(result.status);
      setContacts(result.contacts);
      return result.status === 'completed' || result.status === 'failed' || result.status === 'cancelled';
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load results.');
      return true; // stop polling on error rather than retry-storm a failing endpoint
    }
  }, [searchId, withAuth]);

  const stopSearch = useCallback(async () => {
    if (!searchId || stopping) return;
    setStopping(true);
    setError(null);
    stopRequestedRef.current = true;
    try {
      await withAuth((token) => searchesApi.cancelSearch(searchId, token));
      if (pollRef.current) clearTimeout(pollRef.current);
      setStatus('cancelled');
    } catch (err) {
      stopRequestedRef.current = false;
      setError(err instanceof ApiRequestError ? err.message : 'Could not stop this search.');
    } finally {
      setStopping(false);
    }
  }, [searchId, stopping, withAuth]);

  useEffect(() => {
    let cancelled = false;

    // Self-scheduling loop rather than setInterval: the next poll is only
    // queued after the current one settles, so a slow/stalled request
    // can't cause requests to stack up faster than the server (or the
    // browser's per-domain connection limit) can handle.
    const runPoll = async () => {
      const shouldStop = await fetchResults();
      if (!cancelled && !stopRequestedRef.current && !shouldStop) {
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
  const cancelled = status === 'cancelled';

  return (
    <View style={styles.screen}>
      <TopBar showBack title="Results" credits={wallet?.balance} />

      <View style={styles.controlBar}>
        <View style={styles.statusCopy}>
          <Text style={styles.statusTitle}>{isSearching ? 'Searching public sources' : failed ? 'Search failed' : cancelled ? 'Search stopped' : `${contacts.length} prospects found`}</Text>
          <Text style={styles.statusSubtitle}>{isSearching ? 'New matches will appear here as they are found.' : cancelled ? `${contacts.length} matches found before stopping.` : 'Review, save, or reveal the contacts below.'}</Text>
        </View>
        {isSearching && <View style={styles.searchActions}><View style={styles.spinner}><ActivityIndicator size="small" color={colors.secondary} /></View><Button label="Stop" variant="outline" loading={stopping} onPress={() => void stopSearch()} style={styles.stopButton} /></View>}
      </View>

      {(error || failed) && (
        <View style={styles.errorBox}>
          <View style={styles.errorCopy}>
            <Ionicons name="alert-circle-outline" size={20} color={colors.error} />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorTitle}>Search could not be completed</Text>
              <Text style={styles.errorText}>{error ?? 'A public data source did not respond. Your partial results are preserved; you can retry safely.'}</Text>
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
          !isSearching && !error && !failed && !cancelled ? (
            <View style={styles.empty}>
              <Ionicons name="search-outline" size={28} color={colors.outline} />
              <Text style={styles.emptyTitle}>No matches yet</Text>
              <Text style={styles.emptyText}>Try a broader industry, a country instead of a city, or fewer keywords.</Text>
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
    paddingVertical: 14,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  statusCopy: { flex: 1, gap: 2 },
  statusTitle: { ...typography.bodyLg, color: colors.primary, fontWeight: '800' },
  statusSubtitle: { ...typography.labelMd, color: colors.outline, fontWeight: '400' },
  spinner: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  searchActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stopButton: { minHeight: 36, paddingVertical: 6, paddingHorizontal: 12 },
  errorBox: { margin: spacing.containerMargin, padding: 16, gap: 14, borderRadius: radius.lg, backgroundColor: colors.errorContainer },
  errorCopy: { flexDirection: 'row', gap: 10 },
  errorTitle: { ...typography.bodyMd, color: colors.onErrorContainer, fontWeight: '800' },
  errorText: { ...typography.labelMd, color: colors.onErrorContainer, marginTop: 2 },
  listContent: { padding: spacing.containerMargin, paddingBottom: 40, flexGrow: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 60 },
  emptyTitle: { ...typography.bodyLg, color: colors.primary, fontWeight: '800' },
  emptyText: { ...typography.bodyMd, color: colors.outline, textAlign: 'center', maxWidth: 300 },
});
