// ─── Home Screen ─────────────────────────────────────────────────────────────
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useThemeColor';
import { Card, Button } from '@/components/ui';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/Layout';
import { Colors } from '@/constants/Colors';

export default function HomeScreen() {
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <LinearGradient
          colors={[Colors.palette.primary600, Colors.palette.accent500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>🚀 Cursor Hackathon İstanbul</Text>
          <Text style={styles.heroTitle}>Hazır{'\n'}Başlayalım!</Text>
          <Text style={styles.heroSubtitle}>
            Expo SDK 56 · React Native 0.85 · TypeScript 6
          </Text>
        </LinearGradient>

        {/* Cards */}
        <View style={styles.grid}>
          <Card variant="elevated" style={styles.card}>
            <Text style={[styles.cardIcon]}>⚡</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Expo Router
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Dosya tabanlı navigasyon sistemi
            </Text>
          </Card>

          <Card variant="elevated" style={styles.card}>
            <Text style={styles.cardIcon}>🎯</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Zustand</Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Modern global state yönetimi
            </Text>
          </Card>

          <Card variant="elevated" style={styles.card}>
            <Text style={styles.cardIcon}>🔒</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              SecureStore
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Güvenli veri saklama katmanı
            </Text>
          </Card>

          <Card variant="elevated" style={styles.card}>
            <Text style={styles.cardIcon}>✨</Text>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Reanimated 4
            </Text>
            <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
              Smooth 60fps animasyonlar
            </Text>
          </Card>
        </View>

        <Button
          title="Projeyi Başlat 🎉"
          variant="primary"
          size="lg"
          fullWidth
          style={{ marginTop: Spacing.lg }}
          onPress={() => {}}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    padding: Spacing.base,
    gap: Spacing.base,
  },
  hero: {
    borderRadius: BorderRadius.xl,
    padding: Spacing['2xl'],
    gap: Spacing.sm,
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
    lineHeight: 40,
  },
  heroSubtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: Spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    gap: Spacing.xs,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  cardDesc: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
});
