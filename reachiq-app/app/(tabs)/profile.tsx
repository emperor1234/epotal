import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { Input } from '../../components/Input';
import { TopBar } from '../../components/TopBar';
import { ApiRequestError } from '../../config/api';
import { useAuth } from '../../context/auth';
import * as aiApi from '../../data/aiApi';
import { colors, radius, spacing, typography } from '../../theme/tokens';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, wallet, refreshWallet, signOut, withAuth } = useAuth();

  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [keyBusy, setKeyBusy] = useState(false);
  const [keyError, setKeyError] = useState<string | null>(null);

  const loadKeyStatus = useCallback(async () => {
    try {
      const { hasKey: result } = await withAuth((token) => aiApi.getAiKeyStatus(token));
      setHasKey(result);
    } catch {
      setHasKey(false);
    }
  }, [withAuth]);

  useEffect(() => {
    refreshWallet();
    loadKeyStatus();
  }, [refreshWallet, loadKeyStatus]);

  const handleSaveKey = async () => {
    setKeyError(null);
    setKeyBusy(true);
    try {
      await withAuth((token) => aiApi.saveAiKey(keyInput.trim(), token));
      setKeyInput('');
      setHasKey(true);
    } catch (err) {
      setKeyError(err instanceof ApiRequestError ? err.message : 'Could not save key.');
    } finally {
      setKeyBusy(false);
    }
  };

  const handleDeleteKey = async () => {
    setKeyError(null);
    setKeyBusy(true);
    try {
      await withAuth((token) => aiApi.deleteAiKey(token));
      setHasKey(false);
    } catch (err) {
      setKeyError(err instanceof ApiRequestError ? err.message : 'Could not delete key.');
    } finally {
      setKeyBusy(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopBar title="ReachIQ" credits={wallet?.balance} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.identityRow}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={26} color={colors.outline} />
          </View>
          <View>
            <Text style={styles.name}>{user?.email ?? 'Unknown user'}</Text>
          </View>
        </View>

        <Card style={styles.section}>
          <Text style={styles.label}>Credit Wallet</Text>
          <View style={styles.walletRow}>
            <Text style={styles.walletValue}>{wallet?.balance ?? '—'}</Text>
            <Text style={styles.walletCaption}>Credits available</Text>
          </View>
        </Card>

        <Card style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Ionicons name="hardware-chip-outline" size={18} color={colors.onSurface} />
            <Text style={styles.sectionTitle}>AI Configuration (BYOK)</Text>
          </View>
          <View style={styles.divider} />

          {hasKey ? (
            <>
              <Text style={styles.fieldLabel}>OpenAI API Key</Text>
              <View style={styles.keyRow}>
                <Input value="sk-••••••••••••••••••••••" editable={false} style={{ flex: 1 }} />
                <Pressable style={styles.deleteButton} onPress={handleDeleteKey} disabled={keyBusy}>
                  <Text style={styles.deleteButtonText}>{keyBusy ? 'Removing…' : 'Delete Key'}</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.fieldLabel}>OpenAI API Key</Text>
              <Input placeholder="sk-..." autoCapitalize="none" value={keyInput} onChangeText={setKeyInput} />
              <Button label={keyBusy ? 'Saving…' : 'Save Key'} variant="secondary" loading={keyBusy} onPress={handleSaveKey} />
            </>
          )}

          {keyError && <Text style={styles.keyErrorText}>{keyError}</Text>}

          <View style={styles.warningBox}>
            <Ionicons name="warning-outline" size={16} color={colors.error} />
            <Text style={styles.warningText}>
              Your key is encrypted and never stored in plaintext. Without a key, contact summaries fall back to a templated
              description instead of AI-generated text.
            </Text>
          </View>
        </Card>

        <Card style={[styles.section, { padding: 0, overflow: 'hidden' }]}>
          <Text style={styles.complianceHeader}>COMPLIANCE & PRIVACY</Text>
          <Pressable style={styles.linkRow} onPress={() => router.push('/suppression')}>
            <Ionicons name="ban-outline" size={18} color={colors.onSurface} />
            <Text style={styles.linkText}>Suppression List</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.outline} />
          </Pressable>
        </Card>

        <Pressable style={styles.logoutRow} onPress={signOut}>
          <Ionicons name="log-out-outline" size={18} color={colors.error} />
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.containerMargin, gap: spacing.elementSpacing, paddingBottom: 40 },
  identityRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { ...typography.headlineMd, color: colors.primary },
  section: { gap: 8 },
  label: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '700' },
  walletRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  walletValue: { fontSize: 32, fontWeight: '800', color: colors.primary },
  walletCaption: { ...typography.bodyMd, color: colors.onSurfaceVariant },
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
  keyErrorText: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  warningBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: colors.errorContainer,
    padding: 10,
    borderRadius: radius.md,
  },
  warningText: { ...typography.labelSm, color: colors.onErrorContainer, flex: 1, lineHeight: 15 },
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
  logoutRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 },
  logoutText: { color: colors.error, fontWeight: '700' },
});
