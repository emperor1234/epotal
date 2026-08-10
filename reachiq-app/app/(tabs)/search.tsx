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

const SUGGESTIONS = ['Founder', 'Revenue', 'Engineering'];
const SENIORITY = ['Any', 'Manager', 'Director', 'Executive'];
const SOURCES: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'logo-linkedin', label: 'LinkedIn' },
  { icon: 'logo-facebook', label: 'Facebook' },
  { icon: 'logo-instagram', label: 'Instagram' },
  { icon: 'logo-twitter', label: 'X' },
  { icon: 'globe-outline', label: 'Company sites' },
];

export default function SearchScreen() {
  const router = useRouter();
  const { withAuth, wallet } = useAuth();

  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');
  const [industry, setIndustry] = useState('');
  const [country, setCountry] = useState('');
  const [seniority, setSeniority] = useState('Any');
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
        <View style={styles.intro}>
          <Text style={styles.eyebrow}>PROSPECT DISCOVERY</Text>
          <Text style={styles.title}>Who are you looking for?</Text>
          <Text style={styles.subtitle}>Describe the market and role. ReachIQ searches public professional and company sources.</Text>
        </View>

        <View style={styles.sourcesRow}>
          {SOURCES.map((source) => <View key={source.label} style={styles.sourceChip}><Ionicons name={source.icon} size={14} color={colors.onSurfaceVariant} /><Text style={styles.sourceText}>{source.label}</Text></View>)}
        </View>

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

        <TextField label="Industry" placeholder="e.g. Financial technology" icon="briefcase-outline" value={industry} onChangeText={setIndustry} />
        <TextField label="Location" placeholder="e.g. United Kingdom" icon="location-outline" value={country} onChangeText={setCountry} />

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
          <View style={styles.toggleCopy}>
            <View style={styles.toggleLabelRow}><Text style={styles.toggleLabel}>Deep search</Text><Ionicons name="information-circle-outline" size={16} color={colors.outline} /></View>
            <Text style={styles.toggleDescription}>Search directories too. This takes longer but can find more companies.</Text>
          </View>
          <Switch
            value={fullCrawl}
            onValueChange={setFullCrawl}
            trackColor={{ false: colors.surfaceContainerHigh, true: colors.secondary }}
          />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          label="Find prospects"
          variant="primary"
          icon="search"
          loading={submitting}
          onPress={handleSearch}
        />

        <Text style={styles.disclaimer}>Results come from publicly indexed pages and may need verification before outreach.</Text>
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
  content: { padding: spacing.containerMargin, gap: 20, paddingBottom: 40, width: '100%', maxWidth: 720, alignSelf: 'center' },
  intro: { gap: 6, paddingTop: 4 },
  eyebrow: { ...typography.labelSm, color: colors.secondary, fontWeight: '800', letterSpacing: 1.1 },
  title: { fontSize: 28, lineHeight: 34, fontWeight: '800', letterSpacing: -0.7, color: colors.primary },
  subtitle: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  sourcesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  sourceChip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.outlineVariant, backgroundColor: colors.surfaceContainerLowest, borderRadius: radius.full, paddingHorizontal: 9, paddingVertical: 6 },
  sourceText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontWeight: '600' },
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
    justifyContent: 'space-between', backgroundColor: colors.surfaceContainerLowest, borderWidth: 1, borderColor: colors.outlineVariant, borderRadius: radius.md, padding: 14, gap: 16,
  },
  toggleCopy: { flex: 1, gap: 3 },
  toggleLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleLabel: { ...typography.bodyLg, fontWeight: '700', color: colors.onSurface },
  toggleDescription: { ...typography.labelMd, color: colors.outline, fontWeight: '400' },
  error: { ...typography.labelMd, color: colors.error, fontWeight: '600' },
  disclaimer: { ...typography.labelSm, color: colors.outline, textAlign: 'center', lineHeight: 16 },
});
