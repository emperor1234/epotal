import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Contact } from '../data/contacts';
import { colors, radius, spacing, typography } from '../theme/tokens';
import { Badge } from './Badge';

export function ProfileCard({ contact, onReveal }: { contact: Contact; onReveal?: () => void }) {
  const router = useRouter();
  const [revealed, setRevealed] = useState(false);

  const confidenceColor = contact.status === 'Verified' ? colors.emerald : colors.amber;

  return (
    <Pressable style={styles.card} onPress={() => router.push(`/contact/${contact.id}`)}>
      <View style={styles.topRow}>
        <View style={styles.identityRow}>
          <View style={styles.avatarWrap}>
            <Image source={{ uri: contact.avatar }} style={styles.avatar} contentFit="cover" />
            {contact.status === 'Verified' && (
              <View style={styles.checkBadge}>
                <Ionicons name="checkmark-circle" size={16} color={colors.emerald} />
              </View>
            )}
          </View>
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{contact.name}</Text>
              <Badge label={contact.status} tone={contact.status === 'Verified' ? 'verified' : 'catchAll'} />
            </View>
            <Text style={styles.title}>{contact.title}</Text>
            <View style={styles.metaRow}>
              <Text style={styles.metaCompany}>{contact.company}</Text>
              <View style={styles.metaItem}>
                <Ionicons name="location-outline" size={13} color={colors.outline} />
                <Text style={styles.metaText}>{contact.location}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="people-outline" size={13} color={colors.outline} />
                <Text style={styles.metaText}>{contact.companySize}</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.actionRow}>
        <View>
          <Text style={styles.confidenceLabel}>Email Confidence</Text>
          <View style={styles.confidenceBars}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[styles.bar, { backgroundColor: i <= contact.confidence ? confidenceColor : colors.outlineVariant }]}
              />
            ))}
          </View>
        </View>
        <Pressable
          style={[styles.revealButton, revealed && styles.revealButtonDone]}
          onPress={(e) => {
            e.stopPropagation();
            setRevealed(true);
            onReveal?.();
          }}
        >
          <Ionicons name={revealed ? 'mail' : 'lock-open-outline'} size={16} color={revealed ? colors.primary : colors.onSecondary} />
          <Text style={[styles.revealText, revealed && styles.revealTextDone]}>
            {revealed ? contact.email : 'Reveal for 1 Credit'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          <View style={styles.footerItem}>
            <Ionicons name="at-outline" size={16} color={colors.outline} />
            <Text style={[styles.footerText, !revealed && styles.blurred]}>{contact.email}</Text>
          </View>
          {contact.phone && (
            <View style={styles.footerItem}>
              <Ionicons name="call-outline" size={16} color={colors.outline} />
              <Text style={[styles.footerText, !revealed && styles.blurred]}>{contact.phone}</Text>
            </View>
          )}
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
  },
  revealButtonDone: { backgroundColor: colors.surfaceContainerHigh },
  revealText: { ...typography.labelMd, color: colors.onSecondary, fontWeight: '700' },
  revealTextDone: { color: colors.primary },
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
