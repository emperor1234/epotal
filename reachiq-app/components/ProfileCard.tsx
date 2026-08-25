import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiRequestError } from '../config/api';
import { useAuth } from '../context/auth';
import * as contactsApi from '../data/contactsApi';
import { ApiContact, ApiReveal } from '../data/api-types';
import * as savedContacts from '../data/savedContacts';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { Badge } from './Badge';

export function ProfileCard({
  contact,
  onRevealed,
  onSavedChange,
}: {
  contact: ApiContact;
  onRevealed?: (reveal: ApiReveal) => void;
  onSavedChange?: (saved: boolean) => void;
}) {
  const router = useRouter();
  const { withAuth, refreshWallet } = useAuth();
  const [reveal, setReveal] = useState<ApiReveal | null>(contact.reveal ?? null);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const source = getSourceLabel(contact.sourceUrl, contact.sourceType);

  useEffect(() => {
    savedContacts.isSaved(contact.id).then(setSaved);
  }, [contact.id]);

  useEffect(() => {
    setReveal(contact.reveal ?? null);
  }, [contact.id, contact.reveal]);

  const confidenceColor = reveal?.verificationStatus === 'valid' ? colors.emerald : colors.amber;
  const filledBars = reveal ? Math.max(1, Math.round(reveal.confidence * 4)) : 0;

  const handleReveal = async () => {
    setError(null);
    setRevealing(true);
    try {
      const { reveal: result } = await withAuth((token) => contactsApi.revealContact(contact.id, token));
      setReveal(result);
      onRevealed?.(result);
      await refreshWallet();
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Reveal failed — try again.');
    } finally {
      setRevealing(false);
    }
  };

  const handleSave = async () => {
    const next = await savedContacts.toggleSaved(contact);
    setSaved(next);
    onSavedChange?.(next);
  };

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/contact/${contact.id}`)}>
      <View style={styles.topRow}>
        <View style={styles.identityRow}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={28} color={colors.outline} />
            </View>
            {reveal?.verificationStatus === 'valid' && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.emerald} />
              </View>
            )}
          </View>
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{contact.fullName}</Text>
              {reveal && (
                <Badge
                  label={reveal.verificationStatus === 'valid' ? 'Verified' : reveal.verificationStatus === 'catch_all' ? 'Catch-all' : 'Unverified'}
                  tone={reveal.verificationStatus === 'valid' ? 'verified' : 'catchAll'}
                />
              )}
            </View>
            <Text style={styles.title}>{contact.jobTitle ?? 'Role not listed'}</Text>
            <View style={styles.metaRow}>
              {contact.company?.name && <Text style={styles.metaCompany}>{contact.company.name}</Text>}
              {contact.country && (
                <View style={styles.metaItem}>
                  <Ionicons name="location-outline" size={13} color={colors.outline} />
                  <Text style={styles.metaText}>{contact.country}</Text>
                </View>
              )}
              {contact.company?.sizeRange && (
                <View style={styles.metaItem}>
                  <Ionicons name="people-outline" size={13} color={colors.outline} />
                  <Text style={styles.metaText}>{contact.company.sizeRange}</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      <View style={styles.sourceRow}><Ionicons name={source.icon} size={13} color={colors.secondary} /><Text style={styles.sourceText}>Found on {source.label}</Text></View>

      <View style={styles.availabilityRow}>
        <Ionicons name={contact.emailAvailability === 'needs_company' ? 'alert-circle-outline' : 'mail-outline'} size={14} color={contact.emailAvailability === 'needs_company' ? colors.amber : colors.emerald} />
        <Text style={styles.availabilityText}>{contact.emailAvailability === 'needs_company' ? 'Employer needed for work email' : contact.emailAvailability === 'verified' ? 'Verified work email available' : 'Work email can be checked'}</Text>
        {contact.sourceCount > 1 && <Text style={styles.sourceCount}>{contact.sourceCount} sources</Text>}
      </View>

      <View style={styles.actionRow}>
        {reveal && (
          <View>
            <Text style={styles.confidenceLabel}>Email Confidence</Text>
            <View style={styles.confidenceBars}>
              {[1, 2, 3, 4].map((i) => (
                <View key={i} style={[styles.bar, { backgroundColor: i <= filledBars ? confidenceColor : colors.outlineVariant }]} />
              ))}
            </View>
          </View>
        )}
        <Pressable
          style={[styles.revealButton, reveal && styles.revealButtonDone]}
          disabled={revealing || !!reveal}
          onPress={(e) => {
            e.stopPropagation();
            handleReveal();
          }}
        >
          <Ionicons name={reveal ? 'mail' : 'lock-open-outline'} size={16} color={reveal ? colors.primary : colors.onSecondary} />
          <Text numberOfLines={1} style={[styles.revealText, reveal && styles.revealTextDone]}>
            {revealing ? 'Revealing…' : reveal ? reveal.email : 'Reveal Contact (Free)'}
          </Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.footer}>
        <Text style={styles.openText}>View profile</Text>
        <View style={styles.footerIcons}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={saved ? 'Remove saved contact' : 'Save contact'}
            hitSlop={10}
            onPress={(event) => {
              event.stopPropagation();
              void handleSave();
            }}
          >
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={19} color={saved ? colors.secondary : colors.outline} />
          </Pressable>
          <Ionicons name="chevron-forward" size={18} color={colors.outline} />
        </View>
      </View>
    </Pressable>
  );
}

function getSourceLabel(url?: string | null, sourceType?: string | null): { label: string; icon: keyof typeof Ionicons.glyphMap } {
  const value = (url ?? '').toLowerCase();
  if (value.includes('linkedin.com')) return { label: 'LinkedIn', icon: 'logo-linkedin' };
  if (value.includes('facebook.com')) return { label: 'Facebook', icon: 'logo-facebook' };
  if (value.includes('instagram.com')) return { label: 'Instagram', icon: 'logo-instagram' };
  if (value.includes('twitter.com') || value.includes('x.com')) return { label: 'X', icon: 'logo-twitter' };
  if (sourceType === 'company_site') return { label: 'company website', icon: 'globe-outline' };
  if (sourceType === 'places') return { label: 'business directory', icon: 'location-outline' };
  return { label: 'public web', icon: 'search-outline' };
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.lg,
    padding: spacing.cardPadding,
    gap: 12,
  },
  topRow: { flexDirection: 'row' },
  identityRow: { flexDirection: 'row', gap: 12, flex: 1 },
  avatarWrap: { position: 'relative' },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    padding: 1,
  },
  identityText: { flex: 1, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  name: { ...typography.bodyLg, fontWeight: '700', color: colors.primary },
  title: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontWeight: '600' },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, alignItems: 'center' },
  metaCompany: { ...typography.labelMd, color: colors.onSurface, fontWeight: '700' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  metaText: { ...typography.labelSm, color: colors.outline },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', backgroundColor: '#eff6ff', borderRadius: radius.full, paddingHorizontal: 8, paddingVertical: 4 },
  sourceText: { ...typography.labelSm, color: colors.onPrimaryContainer, fontWeight: '700' },
  availabilityRow: { flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' },
  availabilityText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '600' },
  sourceCount: { ...typography.labelSm, color: colors.outline, marginLeft: 'auto' },
  actionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 },
  confidenceLabel: { fontSize: 10, fontWeight: '700', color: colors.outline, textTransform: 'uppercase', marginBottom: 4 },
  confidenceBars: { flexDirection: 'row', gap: 3 },
  bar: { height: 5, width: 16, borderRadius: radius.full },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginLeft: 'auto', maxWidth: '100%',
  },
  revealButtonDone: { backgroundColor: colors.surfaceContainerHigh },
  revealText: { ...typography.labelMd, color: colors.onSecondary, fontWeight: '700' },
  revealTextDone: { color: colors.primary },
  error: { ...typography.labelSm, color: colors.error, fontWeight: '600' },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    paddingTop: 12,
  },
  openText: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '700' },
  footerIcons: { flexDirection: 'row', gap: 12 },
});
