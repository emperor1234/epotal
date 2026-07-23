import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { ApiRequestError } from '../../config/api';
import { useAuth } from '../../context/auth';
import { ApiContact, ApiReveal, ApiSummary } from '../../data/api-types';
import * as contactsApi from '../../data/contactsApi';
import { colors, radius, spacing, typography } from '../../theme/tokens';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { withAuth, wallet, refreshWallet } = useAuth();

  const [contact, setContact] = useState<ApiContact | null>(null);
  const [summary, setSummary] = useState<ApiSummary | null>(null);
  const [reveal, setReveal] = useState<ApiReveal | null>(null);
  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealError, setRevealError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [{ contact: fetchedContact }, { summary: fetchedSummary }] = await Promise.all([
        withAuth((token) => contactsApi.getContact(id, token)),
        withAuth((token) => contactsApi.getContactSummary(id, token)),
      ]);
      setContact(fetchedContact);
      setSummary(fetchedSummary);
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not load this contact.');
    } finally {
      setLoading(false);
    }
  }, [id, withAuth]);

  useEffect(() => {
    load();
  }, [load]);

  const handleReveal = async () => {
    if (!contact) return;
    setRevealError(null);
    setRevealing(true);
    try {
      const { reveal: result } = await withAuth((token) => contactsApi.revealContact(contact.id, token));
      setReveal(result);
      await refreshWallet();
    } catch (err) {
      setRevealError(err instanceof ApiRequestError ? err.message : 'Reveal failed — try again.');
    } finally {
      setRevealing(false);
    }
  };

  const handleCopy = async () => {
    if (!reveal) return;
    await Clipboard.setStringAsync(reveal.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.secondary} />
      </View>
    );
  }

  if (error || !contact) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error ?? 'Contact not found.'}</Text>
        <Button label="Go back" variant="outline" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.topBarTitle}>ReachIQ</Text>
        <View style={styles.creditPill}>
          <Text style={styles.creditText}>{wallet?.balance ?? '—'} Credits</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroBanner} />
          <View style={styles.heroBody}>
            <View style={styles.avatarWrap}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={40} color={colors.outline} />
              </View>
              {reveal?.verificationStatus === 'valid' && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.emerald} />
                </View>
              )}
            </View>
            <Text style={styles.name}>{contact.fullName}</Text>
            <Text style={styles.title}>
              {contact.jobTitle ?? 'Unknown title'}
              {contact.company ? ` @ ${contact.company.name}` : ''}
            </Text>
            <View style={styles.tagRow}>
              {contact.industry && <Badge label={contact.industry} tone="neutral" />}
              {contact.seniority && <Badge label={contact.seniority} tone="neutral" />}
              {contact.country && <Badge label={contact.country} tone="neutral" />}
            </View>
          </View>
        </View>

        <Card style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="sparkles" size={16} color={colors.secondary} />
            <Text style={styles.sectionTitle}>{summary?.source === 'ai' ? 'AI Professional Summary' : 'Professional Summary'}</Text>
          </View>
          <Text style={styles.summaryText}>{summary?.text ?? 'No summary available yet.'}</Text>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeaderRowBetween}>
            <Text style={styles.sectionTitleDark}>Contact Intelligence</Text>
            {reveal && (
              <Badge
                label={reveal.verificationStatus === 'valid' ? 'Verified' : reveal.verificationStatus === 'catch_all' ? 'Catch-all' : 'Unverified'}
                tone={reveal.verificationStatus === 'valid' ? 'verified' : 'catchAll'}
              />
            )}
          </View>

          {reveal ? (
            <>
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={20} color={colors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactLabel}>Primary Email</Text>
                  <Text style={styles.contactValueLink}>{reveal.email}</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <Button
                  label="Email"
                  variant="secondary"
                  icon="send"
                  style={{ flex: 1 }}
                  onPress={() => void Linking.openURL(`mailto:${reveal.email}`)}
                />
                <Pressable accessibilityRole="button" accessibilityLabel="Copy email address" style={styles.iconButton} onPress={handleCopy}>
                  <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.onSurface} />
                </Pressable>
              </View>
            </>
          ) : (
            <>
              {revealError && <Text style={styles.errorText}>{revealError}</Text>}
              <Button
                label={revealing ? 'Revealing…' : 'Reveal Contact (Free)'}
                variant="secondary"
                icon="lock-open-outline"
                loading={revealing}
                onPress={handleReveal}
              />
            </>
          )}
        </Card>

        {contact.sourceUrl && (
          <View style={styles.sourceNote}>
            <Ionicons name="information-circle-outline" size={14} color={colors.outline} />
            <Text style={styles.sourceNoteText}>Sourced via {contact.sourceType ?? 'unknown source'}</Text>
          </View>
        )}

        {contact.company && (
          <Card style={styles.section}>
            <Text style={styles.sectionTitleUpper}>Company Insights</Text>
            <InsightRow icon="business-outline" label="Company" value={contact.company.name} />
            {contact.company.sizeRange && <InsightRow icon="people-outline" label="Company Size" value={contact.company.sizeRange} />}
            {contact.company.industry && <InsightRow icon="briefcase-outline" label="Industry" value={contact.company.industry} />}
            {contact.company.country && <InsightRow icon="location-outline" label="Headquarters" value={contact.company.country} />}
            <InsightRow icon="globe-outline" label="Domain" value={contact.company.domain} />
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function InsightRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.insightRow}>
      <View style={styles.insightIcon}>
        <Ionicons name={icon} size={16} color={colors.onSurfaceVariant} />
      </View>
      <View>
        <Text style={styles.insightLabel}>{label}</Text>
        <Text style={styles.insightValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: colors.background, padding: spacing.containerMargin },
  errorText: { ...typography.bodyMd, color: colors.error, textAlign: 'center' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: 10,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  topBarTitle: { ...typography.headlineMd, fontWeight: '800', color: colors.primary },
  creditPill: { backgroundColor: colors.inverseSurface, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full },
  creditText: { color: colors.inverseOnSurface, fontSize: 12, fontWeight: '700' },
  content: { paddingBottom: 40 },
  heroCard: { backgroundColor: colors.surfaceContainerLowest },
  heroBanner: { height: 112, backgroundColor: colors.deepNavy },
  heroBody: { alignItems: 'center', paddingBottom: 20, marginTop: -48 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.full,
    borderWidth: 4,
    borderColor: colors.surfaceContainerLowest,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: { position: 'absolute', bottom: 2, right: 2, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.full, padding: 1 },
  name: { ...typography.headlineLg, color: colors.primary, marginTop: 12 },
  title: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  tagRow: { flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: spacing.containerMargin },
  section: { marginHorizontal: spacing.containerMargin, marginTop: spacing.elementSpacing, gap: 12 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sectionHeaderRowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  sectionTitleDark: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  sectionTitleUpper: { ...typography.labelMd, color: colors.outline, textTransform: 'uppercase', fontWeight: '700' },
  summaryText: { ...typography.bodyMd, color: colors.onSurfaceVariant, lineHeight: 20 },
  contactRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  contactLabel: { ...typography.labelSm, color: colors.outline },
  contactValueLink: { ...typography.bodyLg, color: colors.secondary, fontWeight: '700' },
  actionRow: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sourceNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.containerMargin, marginTop: spacing.elementSpacing, justifyContent: 'center' },
  sourceNoteText: { ...typography.labelSm, color: colors.outline },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightIcon: { width: 32, height: 32, borderRadius: radius.DEFAULT, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  insightLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  insightValue: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
});
