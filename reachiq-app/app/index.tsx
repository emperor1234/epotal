import { Ionicons } from '@expo/vector-icons';
import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { ApiRequestError } from '../config/api';
import { useAuth } from '../context/auth';
import { colors, spacing, typography } from '../theme/tokens';

export default function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { width } = useWindowDimensions();

  const handleSignIn = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    try {
      await signIn(email.trim(), password);
      // Navigation on success is handled by the root layout's AuthGate.
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#0b1220', '#172554']} style={styles.hero}>
        <View style={styles.logoMark}><Ionicons name="sparkles" size={20} color="#ffffff" /></View>
        <Text style={styles.heroEyebrow}>B2B INTELLIGENCE, REFINED</Text>
        <Text style={styles.heroTitle}>Find the right people.{'\n'}Reach them with confidence.</Text>
        <Text style={styles.heroText}>Verified contact data, company context, and AI-assisted research in one focused workspace.</Text>
      </LinearGradient>
      <View style={[styles.authColumn, width >= 900 && styles.authColumnWide]}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={22} color={colors.secondary} />
        <Text style={styles.brand}>ReachIQ</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to your prospecting workspace.</Text>

        <View style={styles.form}>
          <Input
            label="Email Address"
            icon="mail-outline"
            placeholder="name@company.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View>
            <View style={styles.passwordLabelRow}>
              <Text style={styles.fieldLabel}>Password</Text>
            </View>
            <Input icon="lock-closed-outline" secure placeholder="••••••••" value={password} onChangeText={setPassword} />
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <Button label="Sign In" variant="secondary" icon="arrow-forward" iconPosition="right" loading={loading} onPress={handleSignIn} />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <Link href="/sign-up" asChild>
              <Text style={styles.link}>Sign Up</Text>
            </Link>
          </View>
        </View>
      </Card>

      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.outline} />
          <Text style={styles.trustText}>SECURE ACCESS</Text>
        </View>
        <View style={styles.trustItem}>
          <Ionicons name="lock-closed-outline" size={14} color={colors.outline} />
          <Text style={styles.trustText}>AES-256</Text>
        </View>
      </View>

      <Text style={styles.copyright}>© 2026 ReachIQ · Secure contact intelligence</Text>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingBottom: 40 },
  hero: { paddingHorizontal: 28, paddingTop: 64, paddingBottom: 48, gap: 14 },
  logoMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  heroEyebrow: { ...typography.labelSm, color: '#93c5fd', fontWeight: '800', letterSpacing: 1.2 },
  heroTitle: { fontSize: 34, lineHeight: 41, letterSpacing: -1, fontWeight: '800', color: '#ffffff', maxWidth: 620 },
  heroText: { ...typography.bodyLg, color: '#cbd5e1', maxWidth: 560 },
  authColumn: { padding: spacing.containerMargin, gap: spacing.sectionGap, width: '100%', maxWidth: 520, alignSelf: 'center', marginTop: 12 },
  authColumnWide: { marginTop: 28 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  brand: { ...typography.headlineMd, fontWeight: '800', color: colors.primary },
  card: { gap: 4, padding: 24 },
  title: { ...typography.headlineLg, textAlign: 'center', color: colors.primary },
  subtitle: { ...typography.bodyMd, textAlign: 'center', color: colors.onSurfaceVariant, marginTop: 4 },
  form: { gap: 16, marginTop: 20 },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  fieldLabel: { ...typography.labelMd, fontSize: 13, fontWeight: '700', color: colors.onSurface },
  forgot: { ...typography.labelMd, color: colors.secondary, fontWeight: '700' },
  error: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  divider: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  dividerText: { ...typography.labelSm, color: colors.outline },
  footerRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  footerText: { color: colors.onSurfaceVariant },
  link: { color: colors.secondary, fontWeight: '700' },
  trustRow: { flexDirection: 'row', justifyContent: 'center', gap: 24 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustText: { ...typography.labelSm, color: colors.outline, letterSpacing: 0.5 },
  copyright: { ...typography.labelSm, color: colors.outline, textAlign: 'center' },
});
