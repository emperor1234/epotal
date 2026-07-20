import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { TopBar } from '../../components/TopBar';
import { colors, radius, spacing, typography } from '../../theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const [useAiSummaries, setUseAiSummaries] = useState(true);

  return (
    <View style={styles.screen}>
      <TopBar title="ReachIQ" credits={540} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identityRow}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=faces' }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.name}>Alex Sterling</Text>
            <Text style={styles.role}>Head of Sales @ CloudNexus</Text>
          </View>
        </View>

        <Card style={styles.section}>
          <Text style={styles.label}>Credit Wallet</Text>
          <View style={styles.walletRow}>
            <Text style={styles.walletValue}>540</Text>
            <Text style={styles.walletCaption}>Credits available</Text>
          </View>
          <Button label="Buy More" variant="secondary" style={styles.buyButton} />
        </Card>

        <Card style={[styles.section, styles.centeredSection]}>
          <Ionicons name="checkmark-circle-outline" size={22} color={colors.secondary} />
          <Text style={styles.proTitle}>Pro Account</Text>
          <Text style={styles.proCaption}>Renewal on Oct 12</Text>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="hardware-chip-outline" size={18} color={colors.onSurface} />
            <Text style={styles.sectionTitle}>AI Configuration (BYOK)</Text>
          </View>
          <View style={styles.divider} />
          <Text style={styles.fieldLabel}>OpenAI API Key</Text>
          <View style={styles.keyRow}>
            <Input value="sk-••••••••••••••••••••••" editable={false} style={{ flex: 1 }} />
            <Pressable style={styles.deleteButton}>
              <Text style={styles.deleteButtonText}>Delete Key</Text>
            </Pressable>
          </View>
          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={styles.warningText}>
              Your key is encrypted and never stored in plaintext. Keep your key safe and rotate it if you suspect a breach.
            </Text>
          </View>
          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleLabel}>Use AI Summaries</Text>
              <Text style={styles.toggleCaption}>Generate insights from lead profiles automatically.</Text>
            </View>
            <Switch
              value={useAiSummaries}
              onValueChange={setUseAiSummaries}
              trackColor={{ false: colors.surfaceContainerHigh, true: colors.secondary }}
            />
          </View>
        </Card>

        <Card style={[styles.section, { padding: 0, overflow: 'hidden' }]}>
          <Text style={styles.complianceHeader}>COMPLIANCE & PRIVACY</Text>
          <Pressable style={styles.linkRow}>
            <Ionicons name="ban-outline" size={18} color={colors.onSurface} />
            <Text style={styles.linkText}>Suppression List</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.linkChevron} />
          </Pressable>
          <View style={styles.divider} />
          <Pressable style={styles.linkRow}>
            <Ionicons name="shield-outline" size={18} color={colors.onSurface} />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} style={styles.linkChevron} />
          </Pressable>
        </Card>

        <Pressable style={styles.logoutRow} onPress={() => router.replace('/')}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        <Text style={styles.version}>ReachIQ Version 2.4.12-stable</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.containerMargin, gap: spacing.elementSpacing, paddingBottom: 40 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar: { width: 56, height: 56, borderRadius: radius.lg },
  name: { ...typography.headlineMd, color: colors.primary },
  role: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  section: { gap: 8 },
  label: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '700' },
  walletRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  walletValue: { fontSize: 32, fontWeight: '800', color: colors.primary },
  walletCaption: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  buyButton: { marginTop: 8, alignSelf: 'flex-start', paddingHorizontal: 24 },
  centeredSection: { alignItems: 'center', gap: 4 },
  proTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface, marginTop: 4 },
  proCaption: { ...typography.labelMd, color: colors.onSurfaceVariant },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sectionTitle: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  divider: { height: 1, backgroundColor: colors.outlineVariant },
  fieldLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '700' },
  keyRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  deleteButton: {
    borderWidth: 1,
    borderColor: colors.error,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  deleteButtonText: { color: colors.error, fontWeight: '700', fontSize: 13 },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.errorContainer,
    padding: 10,
    borderRadius: radius.md,
  },
  warningText: { ...typography.labelSm, color: colors.onErrorContainer, flex: 1, lineHeight: 15 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleLabel: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  toggleCaption: { ...typography.labelSm, color: colors.onSurfaceVariant },
  complianceHeader: {
    ...typography.labelMd,
    color: colors.outline,
    fontWeight: '700',
    paddingHorizontal: spacing.cardPadding,
    paddingTop: spacing.cardPadding,
    paddingBottom: 8,
    backgroundColor: colors.surfaceContainerLow,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: 14,
  },
  linkText: { ...typography.bodyLg, color: colors.onSurface, flex: 1 },
  linkChevron: {},
  logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  logoutText: { color: colors.error, fontWeight: '700' },
  version: { ...typography.labelSm, color: colors.outline, textAlign: 'center' },
});
