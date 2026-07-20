import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { CONTACTS } from '../../data/contacts';
import { colors, radius, spacing, typography } from '../../theme/tokens';

export default function ContactDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const contact = CONTACTS.find((c) => c.id === id) ?? CONTACTS[0];
  const [copied, setCopied] = useState(false);

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={22} color={colors.primary} />
        </Pressable>
        <Text style={styles.topBarTitle}>ReachIQ</Text>
        <View style={styles.creditPill}>
          <Text style={styles.creditText}>540 Credits</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroCard}>
          <View style={styles.heroBanner} />
          <View style={styles.heroBody}>
            <View style={styles.avatarWrap}>
              <Image source={{ uri: contact.avatar }} style={styles.avatar} contentFit="cover" />
              {contact.status === 'Verified' && (
                <View style={styles.checkBadge}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.emerald} />
                </View>
              )}
            </View>
            <Text style={styles.name}>{contact.name}</Text>
            <Text style={styles.title}>
              {contact.title} @ {contact.company}
            </Text>
            <View style={styles.tagRow}>
              <Badge label="Enterprise Software" tone="neutral" />
              <Badge label="SaaS Growth" tone="neutral" />
              <Badge label={contact.location} tone="neutral" />
            </View>
          </View>
        </View>

        <Card style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="sparkles" size={16} color={colors.secondary} />
            <Text style={styles.sectionTitle}>AI Professional Summary</Text>
          </View>
          <Text style={styles.summaryText}>{contact.aiSummary}</Text>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeaderRowBetween}>
            <Text style={styles.sectionTitleDark}>Contact Intelligence</Text>
            <Badge label="Verified" tone="verified" icon={<Ionicons name="checkmark-circle" size={12} color="#047857" />} />
          </View>

          <View style={styles.contactRow}>
            <Ionicons name="mail-outline" size={20} color={colors.secondary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.contactLabel}>Primary Email</Text>
              <Text style={styles.contactValueLink}>{contact.email}</Text>
            </View>
          </View>
          <View style={styles.actionRow}>
            <Button label="Email" variant="secondary" icon="send" style={{ flex: 1 }} />
            <Pressable style={styles.iconButton} onPress={() => setCopied(true)}>
              <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={18} color={colors.onSurface} />
            </Pressable>
          </View>

          {contact.phone && (
            <>
              <View style={styles.divider} />
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={20} color={colors.secondary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactLabel}>Direct Mobile</Text>
                  <Text style={styles.contactValue}>{contact.phone}</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <Button label="Call" variant="outline" icon="call" style={{ flex: 1 }} />
                <Pressable style={styles.iconButton}>
                  <Ionicons name="chatbubble-outline" size={18} color={colors.onSurface} />
                </Pressable>
              </View>
            </>
          )}
        </Card>

        <View style={styles.sourceNote}>
          <Ionicons name="information-circle-outline" size={14} color={colors.outline} />
          <Text style={styles.sourceNoteText}>Extracted from Company Website & Google Search</Text>
        </View>

        <Card style={styles.section}>
          <Text style={styles.sectionTitleUpper}>Company Insights</Text>
          <InsightRow icon="people-outline" label="Team Size" value={contact.teamSize} />
          <InsightRow icon="people-outline" label="Company Size" value={contact.companySize} />
          <InsightRow icon="cash-outline" label="Estimated Revenue" value={contact.estimatedRevenue} />
          <InsightRow icon="location-outline" label="Headquarters" value={contact.headquarters} />
          <Button label="View Company Profile" variant="outline" />
        </Card>

        <Card style={styles.section}>
          <Text style={styles.sectionTitleUpper}>Recent Activity</Text>
          <View style={styles.activityRow}>
            <View style={styles.activityDot} />
            <View>
              <Text style={styles.activityTime}>2 days ago</Text>
              <Text style={styles.activityText}>Profile data updated via LinkedIn</Text>
            </View>
          </View>
        </Card>
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
  heroBanner: { height: 90, backgroundColor: colors.secondary },
  heroBody: { alignItems: 'center', paddingBottom: 20, marginTop: -48 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: radius.full, borderWidth: 4, borderColor: colors.surfaceContainerLowest },
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
  contactValue: { ...typography.bodyLg, color: colors.onSurface, fontWeight: '700' },
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
  divider: { height: 1, backgroundColor: colors.outlineVariant, marginVertical: 4 },
  sourceNote: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: spacing.containerMargin, marginTop: spacing.elementSpacing, justifyContent: 'center' },
  sourceNoteText: { ...typography.labelSm, color: colors.outline },
  insightRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  insightIcon: { width: 32, height: 32, borderRadius: radius.DEFAULT, backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center' },
  insightLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  insightValue: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  activityRow: { flexDirection: 'row', gap: 10 },
  activityDot: { width: 10, height: 10, borderRadius: radius.full, borderWidth: 2, borderColor: colors.secondary, marginTop: 4 },
  activityTime: { ...typography.labelSm, color: colors.outline },
  activityText: { ...typography.bodyMd, color: colors.onSurface },
});
