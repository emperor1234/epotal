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
    <ScrollView contentContainerStyle={[styles.content, width >= 900 && styles.contentWide]} keyboardShouldPersistTaps="handled">
      <LinearGradient colors={['#081225', '#172554']} style={[styles.hero, width >= 900 && styles.heroWide]}>
        <View style={styles.logoMark}><Ionicons name="sparkles" size={20} color="#ffffff" /></View>
        <Text style={styles.heroEyebrow}>REACHIQ</Text>
        <Text style={[styles.heroTitle, width < 900 && styles.heroTitleMobile]}>Find the people behind growing companies.</Text>
        <Text style={styles.heroText}>Search public professional sources, organize prospects, and reveal contact details in one workspace.</Text>
        {width >= 900 && (
          <View style={styles.featureList}>
            <Feature icon="search" text="Multi-source professional search" />
            <Feature icon="bookmark" text="Shortlists that stay organized" />
            <Feature icon="shield-checkmark" text="Compliance-aware contact workflow" />
          </View>
        )}
      </LinearGradient>
      <View style={[styles.authColumn, width >= 900 && styles.authColumnWide]}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={22} color={colors.secondary} />
        <Text style={styles.brand}>Sign in</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Continue to your prospecting workspace.</Text>

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

      <Text style={styles.copyright}>Your credentials are sent securely to the ReachIQ API.</Text>
      </View>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return <View style={styles.feature}><View style={styles.featureIcon}><Ionicons name={icon} size={16} color="#bfdbfe" /></View><Text style={styles.featureText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, paddingBottom: 28 },
  contentWide: { flexDirection: 'row', paddingBottom: 0, minHeight: '100%' },
  hero: { paddingHorizontal: 24, paddingTop: 30, paddingBottom: 28, gap: 10 },
  heroWide: { width: '46%', minHeight: '100%', paddingHorizontal: 64, paddingVertical: 72, justifyContent: 'center', gap: 18 },
  logoMark: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  heroEyebrow: { ...typography.labelSm, color: '#93c5fd', fontWeight: '800', letterSpacing: 1.5 },
  heroTitle: { fontSize: 44, lineHeight: 52, letterSpacing: -1.4, fontWeight: '800', color: '#ffffff', maxWidth: 620 },
  heroTitleMobile: { fontSize: 29, lineHeight: 35, letterSpacing: -0.8 },
  heroText: { ...typography.bodyLg, color: '#cbd5e1', maxWidth: 560 },
  featureList: { gap: 12, marginTop: 18 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: 'rgba(59,130,246,0.18)', alignItems: 'center', justifyContent: 'center' },
  featureText: { ...typography.bodyMd, color: '#e2e8f0', fontWeight: '600' },
  authColumn: { padding: spacing.containerMargin, gap: 14, width: '100%', maxWidth: 480, alignSelf: 'center', marginTop: 4 },
  authColumnWide: { marginTop: 28 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  brand: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurfaceVariant },
  card: { gap: 4, padding: 22 },
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
  copyright: { ...typography.labelSm, color: colors.outline, textAlign: 'center' },
});
