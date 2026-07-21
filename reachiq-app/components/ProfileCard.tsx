import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ApiRequestError } from '../config/api';
import { useAuth } from '../context/auth';
import * as contactsApi from '../data/contactsApi';
import { ApiContact, ApiReveal } from '../data/api-types';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { Badge } from './Badge';

export function ProfileCard({ contact, onRevealed }: { contact: ApiContact; onRevealed?: (reveal: ApiReveal) => void }) {
  const router = useRouter();
  const { withAuth, refreshWallet } = useAuth();
  const [reveal, setReveal] = useState<ApiReveal | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            <Text style={styles.title}>{contact.jobTitle ?? 'Unknown title'}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaCompany}>{contact.company?.name ?? 'Unknown company'}</Text>
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
          <Text style={[styles.revealText, reveal && styles.revealTextDone]}>
            {revealing ? 'Revealing…' : reveal ? reveal.email : 'Reveal Contact (Free)'}
          </Text>
        </Pressable>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={styles.footerItem}>
            <Ionicons name="at-outline" size={16} color={colors.outline} />
            <Text style={[styles.footerText, !reveal && styles.blurred]}>{reveal?.email ?? '••••••@••••••.com'}</Text>
          </View>
        </View>
        <View style={styles.footerIcons}>
          <Ionicons name="bookmark-outline" size={18} color={colors.outline} />
          <Ionicons name="share-social-outline" size={18} color={colors.outline} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
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
  actionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  confidenceLabel: { fontSize: 10, fontWeight: '700', color: colors.outline, textTransform: 'uppercase', marginBottom: 4 },
  confidenceBars: { flexDirection: 'row', gap: 3 },
  bar: { height: 5, width: 16, borderRadius: radius.full },
  revealButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginLeft: 'auto',
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
  footerLeft: { flexDirection: 'row', gap: 16, flexWrap: 'wrap' },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { ...typography.labelMd, color: colors.outline },
  blurred: { opacity: 0.4 },
  footerIcons: { flexDirection: 'row', gap: 12 },
});
