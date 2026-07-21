import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/Button';
import { Card } from '../../components/Card';
import { TopBar } from '../../components/TopBar';
import { ApiRequestError } from '../../config/api';
import { useAuth } from '../../context/auth';
import * as searchesApi from '../../data/searches';
import { colors, radius, spacing, typography } from '../../theme/tokens';

const SUGGESTIONS = ['AI/ML', 'B2B', 'Cloud'];
const SENIORITY = ['Junior', 'Mid', 'Senior', 'Exec'];

export default function SearchScreen() {
  const router = useRouter();
  const { withAuth, wallet } = useAuth();

  const [keywords, setKeywords] = useState(['SaaS', 'Fintech']);
  const [keywordInput, setKeywordInput] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [seniority, setSeniority] = useState('Junior');
  const [fullCrawl, setFullCrawl] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addKeyword = (word: string) => {
    const trimmed = word.trim();
    if (trimmed && !keywords.includes(trimmed)) setKeywords((k) => [...k, trimmed]);
    setKeywordInput('');
  };

  const removeKeyword = (word: string) => setKeywords((k) => k.filter((w) => w !== word));

  const handleSearch = async () => {
    setError(null);
    if (!industry.trim() || !country.trim()) {
      setError('Industry and Country are required.');
      return;
    }
    setSubmitting(true);
    try {
      const { searchQuery } = await withAuth((token) =>
        searchesApi.createSearch(
          {
            industry: industry.trim(),
            country: country.trim(),
            seniority,
            keywords,
            mode: fullCrawl ? 'full_directory' : 'quick',
          },
          token,
        ),
      );
      router.push({ pathname: '/search-results', params: { searchId: searchQuery.id } });
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Could not reach the server. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.screen}>
      <TopBar credits={wallet?.balance} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.headerCard}>
          <Text style={styles.title}>Professional Search</Text>
          <Text style={styles.subtitle}>Find verified B2B contacts across 200M+ profiles with precision filters.</Text>
        </Card>

        <View style={styles.section}>
          <Text style={styles.label}>Keywords</Text>
          <View style={styles.keywordField}>
            {keywords.map((word) => (
              <View key={word} style={styles.chip}>
                <Text style={styles.chipText}>{word}</Text>
                <Pressable onPress={() => removeKeyword(word)} hitSlop={6}>
                  <Ionicons name="close" size={14} color={colors.onSurfaceVariant} />
                </Pressable>
              </View>
            ))}
            <TextInput
              style={styles.keywordInput}
              placeholder="Add keywords..."
              placeholderTextColor={colors.outline}
              value={keywordInput}
              onChangeText={setKeywordInput}
              onSubmitEditing={() => addKeyword(keywordInput)}
              returnKeyType="done"
            />
          </View>
          <View style={styles.suggestionsRow}>
            <Text style={styles.suggestionsLabel}>Suggestions: </Text>
            {SUGGESTIONS.map((s) => (
              <Pressable key={s} onPress={() => addKeyword(s)}>
                <Text style={styles.suggestionLink}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <TextField label="Industry" placeholder="e.g. SaaS" icon="briefcase-outline" value={industry} onChangeText={setIndustry} />
        <TextField label="Country" placeholder="e.g. United Kingdom" icon="earth" value={country} onChangeText={setCountry} />

        <View style={styles.section}>
          <Text style={styles.label}>Seniority Level</Text>
          <View style={styles.segmented}>
            {SENIORITY.map((level) => {
              const active = level === seniority;
              return (
                <Pressable
                  key={level}
                  onPress={() => setSeniority(level)}
                  style={[styles.segment, active && styles.segmentActive]}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{level}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={styles.toggleRow}>
          <View style={styles.toggleLabelRow}>
            <Text style={styles.toggleLabel}>Full Directory Crawl</Text>
            <Ionicons name="information-circle-outline" size={16} color={colors.outline} />
          </View>
          <Switch
            value={fullCrawl}
            onValueChange={setFullCrawl}
            trackColor={{ false: colors.surfaceContainerHigh, true: colors.secondary }}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          label="Search Professionals"
          variant="dark"
          icon="people-outline"
          loading={submitting}
          onPress={handleSearch}
        />

        <View style={styles.footerRow}>
          <View style={styles.footerItem}>
            <Text style={styles.footerText}>Verified Records Only</Text>
          </View>
          <View style={styles.footerItem}>
            <Ionicons name="flash" size={14} color={colors.secondary} />
            <Text style={styles.footerText}>Instant Reveal</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TextField({
  label,
  placeholder,
  icon,
  value,
  onChangeText,
}: {
  label: string;
  placeholder: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  onChangeText: (text: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.selectField}>
        <TextInput
          style={styles.selectInput}
          placeholder={placeholder}
          placeholderTextColor={colors.outline}
          value={value}
          onChangeText={onChangeText}
        />
        <Ionicons name={icon} size={18} color={colors.outline} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.containerMargin, gap: spacing.sectionGap, paddingBottom: 40 },
  headerCard: { gap: 6 },
  title: { ...typography.headlineLg, color: colors.primary },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  section: { gap: 8 },
  label: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '700', textTransform: 'none' },
  keywordField: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    padding: 10,
    minHeight: 48,
    backgroundColor: colors.surfaceContainerLowest,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  chipText: { ...typography.bodyMd, color: colors.onSurface, fontWeight: '600' },
  keywordInput: { flex: 1, minWidth: 100, ...typography.bodyLg, color: colors.onSurface },
  suggestionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  suggestionsLabel: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  suggestionLink: { ...typography.bodyMd, color: colors.secondary, fontWeight: '700' },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    height: 48,
    backgroundColor: colors.surfaceContainerLowest,
  },
  selectInput: { flex: 1, ...typography.bodyLg, color: colors.onSurface },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    padding: 4,
    gap: 4,
  },
  segment: { flex: 1, paddingVertical: 10, borderRadius: radius.DEFAULT, alignItems: 'center' },
  segmentActive: { backgroundColor: colors.surfaceContainerLowest },
  segmentText: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontWeight: '600' },
  segmentTextActive: { color: colors.onSurface, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleLabel: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  error: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerText: { ...typography.labelMd, color: colors.onSurfaceVariant, fontWeight: '600' },
});
