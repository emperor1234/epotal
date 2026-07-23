import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { TopBar } from '../components/TopBar';
import { ApiRequestError } from '../config/api';
import { useAuth } from '../context/auth';
import * as suppressionApi from '../data/suppressionApi';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function SuppressionScreen() {
  const { withAuth } = useAuth();
  const [entries, setEntries] = useState<suppressionApi.SuppressionEntry[]>([]);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await withAuth(suppressionApi.listSuppressions);
      setEntries(result.entries);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load the suppression list.');
    } finally {
      setLoading(false);
    }
  }, [withAuth]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    setError(null);
    if (!email.trim() || !reason.trim()) {
      setError('Enter an email and a reason.');
      return;
    }
    setBusy(true);
    try {
      const { entry } = await withAuth((token) => suppressionApi.addSuppression(email.trim(), reason.trim(), token));
      setEntries((current) => [entry, ...current.filter((item) => item.id !== entry.id)]);
      setEmail('');
      setReason('');
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not add this address.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (entry: suppressionApi.SuppressionEntry) => {
    setError(null);
    try {
      await withAuth((token) => suppressionApi.removeSuppression(entry.email, token));
      setEntries((current) => current.filter((item) => item.id !== entry.id));
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not remove this address.');
    }
  };

  return (
    <View style={styles.screen}>
      <TopBar title="Suppression list" showBack />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Card style={styles.card}>
          <View style={styles.headingRow}>
            <View style={styles.icon}><Ionicons name="shield-checkmark-outline" size={22} color={colors.secondary} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Protect opt-outs</Text>
              <Text style={styles.subtitle}>Suppressed addresses are blocked before contact reveal.</Text>
            </View>
          </View>
          <Input label="Email address" placeholder="person@company.com" keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} />
          <Input label="Reason" placeholder="Opted out, legal request…" value={reason} onChangeText={setReason} />
          {error && <Text style={styles.error}>{error}</Text>}
          <Button label="Add to suppression list" icon="add" loading={busy} onPress={add} />
        </Card>

        <Text style={styles.sectionLabel}>SUPPRESSED ADDRESSES · {entries.length}</Text>
        {loading ? (
          <ActivityIndicator color={colors.secondary} />
        ) : entries.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No suppressed addresses</Text>
            <Text style={styles.subtitle}>Addresses you add will appear here.</Text>
          </View>
        ) : (
          entries.map((entry) => (
            <Card key={entry.id} style={styles.entry}>
              <View style={{ flex: 1 }}>
                <Text style={styles.email}>{entry.email}</Text>
                <Text style={styles.reason}>{entry.reason}</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${entry.email}`} hitSlop={8} onPress={() => void remove(entry)}>
                <Ionicons name="trash-outline" size={20} color={colors.error} />
              </Pressable>
            </Card>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.containerMargin, gap: spacing.stackGap, paddingBottom: 48 },
  card: { gap: 16 },
  headingRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { width: 46, height: 46, borderRadius: radius.lg, backgroundColor: colors.primaryContainer, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.headlineMd, color: colors.primary, fontWeight: '800' },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  error: { ...typography.labelMd, color: colors.error, fontWeight: '700' },
  sectionLabel: { ...typography.labelSm, color: colors.outline, fontWeight: '800', letterSpacing: 0.7, marginTop: 10 },
  empty: { paddingVertical: 44, alignItems: 'center', gap: 4 },
  emptyTitle: { ...typography.bodyLg, color: colors.primary, fontWeight: '800' },
  entry: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16 },
  email: { ...typography.bodyMd, color: colors.primary, fontWeight: '800' },
  reason: { ...typography.labelMd, color: colors.onSurfaceVariant, marginTop: 2 },
});
