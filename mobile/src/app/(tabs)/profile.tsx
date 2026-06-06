// ─── Profile Screen ────────────────────────────────────────────────────────────
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useThemeColor';
import { Card, Button } from '@/components/ui';
import { FontSize, FontWeight, Spacing } from '@/constants/Layout';

export default function ProfileScreen() {
  const colors = useColors();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Profil</Text>

        <Card variant="elevated" padding="xl">
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>👤</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>Kullanıcı</Text>
          <Text style={[styles.email, { color: colors.textSecondary }]}>
            user@example.com
          </Text>
        </Card>

        <Button
          title="Çıkış Yap"
          variant="outline"
          fullWidth
          onPress={() => {}}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  container: {
    flex: 1,
    padding: Spacing.base,
    gap: Spacing.base,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: { fontSize: 32 },
  name: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    textAlign: 'center',
  },
  email: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
