// ─── Cursor Agent Demo Screen ────────────────────────────────────────────────
import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useThemeColor';
import { Card, Button, Input } from '@/components/ui';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/Layout';
import { Colors } from '@/constants/Colors';
import { cursor } from '@/services/cursor';

type Status = 'idle' | 'connecting' | 'streaming' | 'done' | 'error';

export default function AgentScreen() {
  const colors = useColors();
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [meta, setMeta] = useState<{ runtime?: string; model?: string }>({});
  const [errorMsg, setErrorMsg] = useState('');
  const cancelRef = useRef<(() => void) | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    cursor
      .health()
      .then((h) => setMeta({ runtime: h.runtime, model: h.model }))
      .catch(() => setMeta({}));
    return () => cancelRef.current?.();
  }, []);

  const run = () => {
    const prompt = input.trim();
    if (!prompt || status === 'streaming' || status === 'connecting') return;

    setOutput('');
    setErrorMsg('');
    setStatus('connecting');

    cancelRef.current = cursor.streamPrompt(prompt, {
      onIds: () => setStatus('streaming'),
      onText: (chunk) => {
        setStatus('streaming');
        setOutput((prev) => prev + chunk);
        requestAnimationFrame(() =>
          scrollRef.current?.scrollToEnd({ animated: true })
        );
      },
      onDone: () => setStatus('done'),
      onError: (msg) => {
        setErrorMsg(msg);
        setStatus('error');
      },
    });
  };

  const busy = status === 'connecting' || status === 'streaming';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <LinearGradient
            colors={[Colors.palette.primary600, Colors.palette.accent500]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroEyebrow}>🤖 Cursor SDK</Text>
            <Text style={styles.heroTitle}>Agent'a Sor</Text>
            <Text style={styles.heroSubtitle}>
              {meta.runtime
                ? `runtime: ${meta.runtime} · model: ${meta.model}`
                : 'backend bağlantısı bekleniyor…'}
            </Text>
          </LinearGradient>

          <Card variant="elevated" style={styles.outputCard}>
            <View style={styles.outputHeader}>
              <Text style={[styles.outputLabel, { color: colors.textSecondary }]}>
                Yanıt
              </Text>
              <StatusBadge status={status} colors={colors} />
            </View>

            {output ? (
              <Text style={[styles.outputText, { color: colors.text }]}>
                {output}
                {status === 'streaming' ? '▍' : ''}
              </Text>
            ) : status === 'connecting' ? (
              <View style={styles.center}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : errorMsg ? (
              <Text style={[styles.outputText, { color: colors.error }]}>
                {errorMsg}
              </Text>
            ) : (
              <Text style={[styles.placeholder, { color: colors.textMuted }]}>
                Bir soru yaz ve "Gönder"e bas. Yanıt canlı olarak akacak.
              </Text>
            )}
          </Card>
        </ScrollView>

        <View style={[styles.composer, { borderTopColor: colors.border }]}>
          <Input
            placeholder="Agent'a bir şey sor…"
            value={input}
            onChangeText={setInput}
            multiline
            editable={!busy}
            onSubmitEditing={run}
          />
          <Button
            title={busy ? 'Akıyor…' : 'Gönder'}
            variant="primary"
            fullWidth
            isLoading={busy}
            onPress={run}
            style={{ marginTop: Spacing.sm }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StatusBadge({
  status,
  colors,
}: {
  status: Status;
  colors: ReturnType<typeof useColors>;
}) {
  const map: Record<Status, { label: string; color: string }> = {
    idle: { label: 'hazır', color: colors.textMuted },
    connecting: { label: 'bağlanıyor', color: colors.primary },
    streaming: { label: 'akıyor', color: colors.primary },
    done: { label: 'tamamlandı', color: colors.success ?? colors.primary },
    error: { label: 'hata', color: colors.error },
  };
  const s = map[status];
  return (
    <Text style={[styles.badge, { color: s.color, borderColor: s.color }]}>
      {s.label}
    </Text>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: Spacing.base, gap: Spacing.base },
  hero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    gap: Spacing.xs,
  },
  heroEyebrow: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: FontSize['3xl'],
    fontWeight: FontWeight.extrabold,
    color: '#FFFFFF',
  },
  heroSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
  },
  outputCard: { gap: Spacing.sm, minHeight: 180 },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  outputLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  badge: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    borderWidth: 1,
    borderRadius: BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  outputText: {
    fontSize: FontSize.base,
    lineHeight: 24,
  },
  placeholder: {
    fontSize: FontSize.sm,
    fontStyle: 'italic',
  },
  center: { paddingVertical: Spacing.xl, alignItems: 'center' },
  composer: {
    padding: Spacing.base,
    borderTopWidth: 1,
    gap: Spacing.xs,
  },
});
