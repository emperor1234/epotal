import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { TopBar } from '../components/TopBar';
import { Button } from '../components/Button';
import { ApiRequestError } from '../config/api';
import { useAuth } from '../context/auth';
import * as intelligenceApi from '../data/intelligenceApi';
import { colors, radius, spacing, typography } from '../theme/tokens';

export default function BulkEnrichScreen() {
  const { withAuth, wallet } = useAuth();
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const submit = async () => {
    setMessage(null);
    const records = value.split('\n').filter((line) => line.trim()).map((line) => {
      const [fullName, jobTitle, companyName, companyDomain, sourceUrl] = line.split('|').map((part) => part.trim());
      return { fullName, jobTitle: jobTitle || undefined, companyName: companyName || undefined, companyDomain: companyDomain || undefined, sourceUrl };
    });
    if (!records.length || records.some((record) => !record.fullName || !record.sourceUrl)) {
      setMessage('Each row needs at least a name and public source URL.');
      return;
    }
    if (records.length > 50) {
      setMessage('Import a maximum of 50 rows at a time.');
      return;
    }
    setLoading(true);
    try {
      const result = await withAuth((token) => intelligenceApi.bulkEnrich(records, token));
      setMessage(`${result.imported} profiles enriched and added to the contact index.`);
      setValue('');
    } catch (err) {
      setMessage(err instanceof ApiRequestError ? err.message : 'Bulk enrichment failed.');
    } finally {
      setLoading(false);
    }
  };

  return <View style={styles.screen}><TopBar showBack title="Bulk enrichment" credits={wallet?.balance} /><ScrollView contentContainerStyle={styles.content}><Text style={styles.title}>Add public profiles</Text><Text style={styles.help}>One profile per line using: Name | Job title | Company | company.com | Public profile URL</Text><TextInput multiline value={value} onChangeText={setValue} placeholder="Jane Doe | VP Sales | Example Inc | example.com | https://example.com/team/jane" placeholderTextColor={colors.outline} style={styles.input} textAlignVertical="top" autoCapitalize="none" /><Button label="Enrich profiles" icon="sparkles" loading={loading} onPress={() => void submit()} />{message && <Text style={styles.message}>{message}</Text>}<Text style={styles.note}>Only import profiles you are permitted to process. ReachIQ keeps the original public source for attribution and removal handling.</Text></ScrollView></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.containerMargin, gap: 16, width: '100%', maxWidth: 720, alignSelf: 'center' },
  title: { fontSize: 26, fontWeight: '800', color: colors.primary },
  help: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  input: { minHeight: 220, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md, backgroundColor: colors.surfaceContainerLowest, padding: 14, ...typography.bodyMd, color: colors.onSurface },
  message: { ...typography.bodyMd, color: colors.secondary, fontWeight: '700' },
  note: { ...typography.labelMd, color: colors.outline },
});
