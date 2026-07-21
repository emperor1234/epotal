import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../theme/tokens';

const DISMISSED_KEY = 'reachiq.installPromptDismissed';

// The browser event fired when a site meets PWA installability criteria.
// Not in lib.dom.d.ts, so it's typed minimally here.
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

export function InstallPrompt() {
  const [deferredEvent, setDeferredEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosInstructions, setShowIosInstructions] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    // Already installed (running standalone) — nothing to prompt.
    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    if (isStandalone) return;

    if (window.localStorage.getItem(DISMISSED_KEY) === '1') {
      setDismissed(true);
      return;
    }

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    if (isIos) {
      // iOS never fires beforeinstallprompt — there is no programmatic
      // install API on that platform. Show manual instructions instead.
      setShowIosInstructions(true);
      return;
    }

    const handler = (event: Event) => {
      event.preventDefault();
      setDeferredEvent(event as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (Platform.OS !== 'web' || dismissed || (!deferredEvent && !showIosInstructions)) {
    return null;
  }

  const dismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') window.localStorage.setItem(DISMISSED_KEY, '1');
  };

  const handleInstall = async () => {
    if (!deferredEvent) return;
    await deferredEvent.prompt();
    await deferredEvent.userChoice;
    setDeferredEvent(null);
    dismiss();
  };

  return (
    <View style={styles.banner}>
      <Ionicons name="download-outline" size={20} color={colors.secondary} />
      <View style={styles.textWrap}>
        {showIosInstructions ? (
          <Text style={styles.text}>
            Install ReachIQ: tap <Ionicons name="share-outline" size={14} /> Share, then "Add to Home Screen".
          </Text>
        ) : (
          <Text style={styles.text}>Install ReachIQ for quick access from your home screen.</Text>
        )}
      </View>
      {!showIosInstructions && (
        <Pressable style={styles.installButton} onPress={handleInstall}>
          <Text style={styles.installButtonText}>Install</Text>
        </Pressable>
      )}
      <Pressable onPress={dismiss} hitSlop={8}>
        <Ionicons name="close" size={18} color={colors.onSurfaceVariant} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingHorizontal: spacing.containerMargin,
    paddingVertical: 10,
  },
  textWrap: { flex: 1 },
  text: { ...typography.labelMd, color: colors.onSurface },
  installButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  installButtonText: { ...typography.labelMd, color: colors.onSecondary, fontWeight: '700' },
});
