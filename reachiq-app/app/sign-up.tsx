import { Ionicons } from '@expo/vector-icons';
import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { colors, spacing, typography } from '../theme/tokens';

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreate = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.replace('/(tabs)/search');
    }, 600);
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={22} color={colors.secondary} />
        <Text style={styles.brand}>ReachIQ</Text>
      </View>

      <Card style={styles.card}>
        <Text style={styles.title}>Create your account</Text>
        <Text style={styles.subtitle}>Start discovering verified B2B contacts.</Text>

        <View style={styles.form}>
          <Input label="Full Name" icon="person-outline" placeholder="Jane Doe" value={name} onChangeText={setName} />
          <Input
            label="Work Email"
            icon="mail-outline"
            placeholder="jane@company.com"
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <Input label="Password" icon="lock-closed-outline" secure placeholder="••••••••" value={password} onChangeText={setPassword} />

          <Button label="Create Account" variant="secondary" icon="arrow-forward" iconPosition="right" loading={loading} onPress={handleCreate} />

          <View style={styles.dividerRow}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR SIGN UP WITH</Text>
            <View style={styles.divider} />
          </View>

          <Button label="Sign up with GitHub" variant="dark" icon="logo-github" />

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/" asChild>
              <Text style={styles.link}>Sign In</Text>
            </Link>
          </View>
        </View>
      </Card>

      <View style={styles.trustRow}>
        <View style={styles.trustItem}>
          <Ionicons name="shield-checkmark-outline" size={14} color={colors.outline} />
          <Text style={styles.trustText}>SOC2 TYPE II</Text>
        </View>
        <View style={styles.trustItem}>
          <Ionicons name="document-text-outline" size={14} color={colors.outline} />
          <Text style={styles.trustText}>AES-256</Text>
        </View>
      </View>

      <Text style={styles.copyright}>© 2024 ReachIQ Intelligence Layer. Enterprise-Grade Security.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.containerMargin, paddingTop: 60, paddingBottom: 40, gap: spacing.sectionGap },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  brand: { ...typography.headlineMd, fontWeight: '800', color: colors.primary },
  card: { gap: 4 },
  title: { ...typography.headlineLg, color: colors.primary },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4 },
  form: { gap: 16, marginTop: 20 },
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
