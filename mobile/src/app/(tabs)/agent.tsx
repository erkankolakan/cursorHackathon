// ─── KentScan Saha Doğrulama Ekranı ──────────────────────────────────────────
import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import * as SecureStore from 'expo-secure-store';
import { useColors } from '@/hooks/useThemeColor';
import { Card, Button } from '@/components/ui';
import { FontSize, FontWeight, Spacing, BorderRadius } from '@/constants/Layout';
import { Colors } from '@/constants/Colors';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8080';
const TOKEN_KEY = 'kentscan_token';
const ORG_KEY = 'kentscan_org_id';

interface Issue {
  type: string;
  severity: string;
  description: string;
  confidence: number;
  recommendation?: string;
  legal_reference?: string;
  estimated_cost?: number;
}

interface ScanResult {
  id: string;
  district: string;
  city: string;
  accessibility_score: number;
  compliance_level: string;
  issues: Issue[];
  status: string;
}

const ISTANBUL_PRESETS = [
  { label: 'Kadıköy', district: 'Kadıköy', city: 'İstanbul', lat: 40.9833, lng: 29.0333 },
  { label: 'Beşiktaş', district: 'Beşiktaş', city: 'İstanbul', lat: 41.0422, lng: 29.0078 },
  { label: 'Şişli', district: 'Şişli', city: 'İstanbul', lat: 41.0602, lng: 28.9878 },
  { label: 'Başakşehir', district: 'Başakşehir', city: 'İstanbul', lat: 41.0865, lng: 28.8017 },
  { label: 'Üsküdar', district: 'Üsküdar', city: 'İstanbul', lat: 41.0231, lng: 29.0152 },
  { label: 'Fatih', district: 'Fatih', city: 'İstanbul', lat: 41.0186, lng: 28.9395 },
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#f87171',
  high: '#fb923c',
  medium: '#fbbf24',
  low: '#94a3b8',
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Kritik',
  high: 'Yüksek',
  medium: 'Orta',
  low: 'Düşük',
};

export default function FieldVerificationScreen() {
  const colors = useColors();
  const [district, setDistrict] = useState('');
  const [city, setCity] = useState('İstanbul');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [token, setToken] = useState('');
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [pollingId, setPollingId] = useState<string | null>(null);

  // Load saved credentials on mount
  useEffect(() => {
    (async () => {
      const savedToken = await SecureStore.getItemAsync(TOKEN_KEY);
      const savedOrg = await SecureStore.getItemAsync(ORG_KEY);
      if (savedToken) setToken(savedToken);
      if (savedOrg) setOrgId(savedOrg);
    })();
  }, []);

  // Polling for async scan result
  useEffect(() => {
    if (!pollingId) return;
    const interval = setInterval(async () => {
      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (orgId) headers['X-Organization-ID'] = orgId;
        const resp = await fetch(`${API_BASE}/api/v1/scans/${pollingId}`, { headers });
        if (resp.ok) {
          const scan: ScanResult = await resp.json();
          setResult(scan);
          if (scan.status === 'completed' || scan.status === 'failed') {
            setPollingId(null);
            setLoading(false);
          }
        }
      } catch {
        // ignore poll errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [pollingId, token, orgId]);

  const applyPreset = useCallback((preset: typeof ISTANBUL_PRESETS[0]) => {
    setDistrict(preset.district);
    setCity(preset.city);
    setLat(String(preset.lat));
    setLng(String(preset.lng));
  }, []);

  const getGPS = useCallback(async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Konum izni verilmedi. Lütfen ayarlardan izin verin.');
        return;
      }
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLat(location.coords.latitude.toFixed(6));
      setLng(location.coords.longitude.toFixed(6));

      // Try to reverse geocode for district/city
      const geocode = await Location.reverseGeocodeAsync({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      if (geocode.length > 0) {
        const geo = geocode[0];
        if (geo.subregion || geo.district) setDistrict(geo.subregion || geo.district || '');
        if (geo.city || geo.region) setCity(geo.city || geo.region || 'İstanbul');
      }
    } catch (err) {
      Alert.alert('GPS Hatası', err instanceof Error ? err.message : 'Konum alınamadı');
    } finally {
      setGpsLoading(false);
    }
  }, []);

  const saveCredentials = useCallback(async () => {
    if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
    if (orgId) await SecureStore.setItemAsync(ORG_KEY, orgId);
  }, [token, orgId]);

  const startScan = useCallback(async () => {
    if (!district || !lat || !lng) {
      Alert.alert('Eksik Bilgi', 'İlçe, enlem ve boylam alanları zorunludur.');
      return;
    }
    await saveCredentials();
    setLoading(true);
    setResult(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      if (orgId) headers['X-Organization-ID'] = orgId;

      const resp = await fetch(`${API_BASE}/api/v1/scans`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ district, city, latitude: parseFloat(lat), longitude: parseFloat(lng) }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { message?: string }).message || `HTTP ${resp.status}`);
      }

      const data: ScanResult = await resp.json();
      setResult(data);

      // Start polling if scan is async (pending/processing)
      if (data.status === 'pending' || data.status === 'processing') {
        setPollingId(data.id);
      } else {
        setLoading(false);
      }
    } catch (err) {
      Alert.alert('Tarama Hatası', err instanceof Error ? err.message : 'Bilinmeyen hata');
      setLoading(false);
    }
  }, [district, city, lat, lng, token, orgId, saveCredentials]);

  const scoreColor =
    result && result.accessibility_score >= 80 ? '#34d399' :
    result && result.accessibility_score >= 60 ? '#fbbf24' : '#f87171';

  const isProcessing = result && (result.status === 'pending' || result.status === 'processing');

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient
          colors={[Colors.palette.primary600, Colors.palette.accent500]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>♿ KentScan</Text>
          <Text style={styles.heroTitle}>Saha Denetimi</Text>
          <Text style={styles.heroSubtitle}>5378 Sayılı Engelliler Kanunu Erişilebilirlik Taraması</Text>
        </LinearGradient>

        {/* Hızlı Seçim */}
        <Card variant="elevated" style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>HIZLI SEÇİM — İSTANBUL</Text>
          <View style={styles.presets}>
            {ISTANBUL_PRESETS.map(p => (
              <TouchableOpacity key={p.label} onPress={() => applyPreset(p)}
                style={[styles.preset, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <Text style={[styles.presetText, { color: colors.text }]}>{p.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        {/* Form */}
        <Card variant="elevated" style={styles.card}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>TARAMA BİLGİLERİ</Text>

          {/* GPS Button */}
          <TouchableOpacity onPress={getGPS} disabled={gpsLoading} style={styles.gpsButton}>
            {gpsLoading ? (
              <ActivityIndicator size="small" color="#3b82f6" />
            ) : (
              <Text style={styles.gpsIcon}>📍</Text>
            )}
            <Text style={styles.gpsText}>{gpsLoading ? 'Konum alınıyor...' : 'GPS ile Konumumu Kullan'}</Text>
          </TouchableOpacity>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>İlçe *</Text>
              <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={district} onChangeText={setDistrict} placeholder="Kadıköy" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.half}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Şehir *</Text>
              <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={city} onChangeText={setCity} placeholderTextColor={colors.textMuted} />
            </View>
          </View>

          <View style={styles.row}>
            <View style={styles.half}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Enlem *</Text>
              <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={lat} onChangeText={setLat} keyboardType="numeric" placeholder="40.9833" placeholderTextColor={colors.textMuted} />
            </View>
            <View style={styles.half}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Boylam *</Text>
              <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                value={lng} onChangeText={setLng} keyboardType="numeric" placeholder="29.0333" placeholderTextColor={colors.textMuted} />
            </View>
          </View>

          <Text style={[styles.label, { color: colors.textSecondary }]}>JWT Token</Text>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={token} onChangeText={setToken} placeholder="eyJ... (SecureStore'a kaydedilir)" placeholderTextColor={colors.textMuted} secureTextEntry />

          <Text style={[styles.label, { color: colors.textSecondary }]}>Organizasyon ID</Text>
          <TextInput style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
            value={orgId} onChangeText={setOrgId} placeholder="uuid..." placeholderTextColor={colors.textMuted} />

          <View style={styles.kvkkNote}>
            <Text style={styles.kvkkText}>🔒 KVKK: Yüzler ve plakalar AI öncesi otomatik anonimleştirilir. Async analiz — arka planda çalışır.</Text>
          </View>

          <Button title={loading ? 'Analiz ediliyor... (arka plan)' : 'Taramayı Başlat'}
            variant="primary" fullWidth isLoading={loading && !isProcessing}
            onPress={startScan} style={{ marginTop: Spacing.sm }} />
        </Card>

        {/* Result */}
        {result && (
          <Card variant="elevated" style={styles.card}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>ANALİZ SONUCU</Text>
            <Text style={[styles.location, { color: colors.text }]}>{result.district}, {result.city}</Text>

            {isProcessing ? (
              <View style={styles.processingRow}>
                <ActivityIndicator color="#3b82f6" />
                <Text style={[styles.processingText, { color: colors.textSecondary }]}>AI analiz ediyor...</Text>
              </View>
            ) : (
              <>
                <View style={styles.scoreRow}>
                  <Text style={[styles.score, { color: scoreColor }]}>{result.accessibility_score}</Text>
                  <View>
                    <Text style={[styles.scoreLabel, { color: colors.textSecondary }]}>Erişilebilirlik Skoru</Text>
                    <Text style={[styles.complianceLevel, { color: scoreColor }]}>{result.compliance_level}</Text>
                  </View>
                </View>

                {result.issues && result.issues.length > 0 ? (
                  <View style={styles.issues}>
                    <Text style={[styles.issueTitle, { color: colors.text }]}>Tespit Edilen Sorunlar</Text>
                    {result.issues.map((issue, i) => (
                      <View key={i} style={[styles.issueRow, { borderColor: colors.border }]}>
                        <Text style={[styles.issueSeverity, { color: SEVERITY_COLORS[issue.severity] }]}>
                          {SEVERITY_LABELS[issue.severity] || issue.severity}
                        </Text>
                        <Text style={[styles.issueDesc, { color: colors.text }]}>{issue.description}</Text>
                        {issue.legal_reference && (
                          <Text style={styles.issueLegal}>⚖️ {issue.legal_reference}</Text>
                        )}
                        {issue.recommendation && (
                          <Text style={[styles.issueRec, { color: colors.textSecondary }]}>💡 {issue.recommendation}</Text>
                        )}
                        {issue.estimated_cost && (
                          <Text style={styles.issueCost}>₺{issue.estimated_cost.toLocaleString('tr-TR')} tahmini maliyet</Text>
                        )}
                        <Text style={[styles.issueConf, { color: colors.textMuted }]}>%{Math.round(issue.confidence * 100)} güven</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.compliant, { color: '#34d399' }]}>✓ Sorun tespit edilmedi — Uyumlu</Text>
                )}
              </>
            )}
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: Spacing.base, gap: Spacing.base },
  hero: { borderRadius: BorderRadius.xl, padding: Spacing['2xl'], gap: Spacing.xs },
  heroEyebrow: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: 'rgba(255,255,255,0.8)' },
  heroTitle: { fontSize: FontSize['3xl'], fontWeight: FontWeight.extrabold, color: '#FFFFFF' },
  heroSubtitle: { fontSize: FontSize.sm, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.xs },
  card: { gap: Spacing.sm },
  sectionTitle: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase' },
  presets: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs },
  preset: { borderWidth: 1, borderRadius: BorderRadius.full, paddingHorizontal: Spacing.sm, paddingVertical: 4 },
  presetText: { fontSize: FontSize.xs },
  gpsButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, backgroundColor: '#172554', borderRadius: BorderRadius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
  gpsIcon: { fontSize: 16 },
  gpsText: { color: '#93c5fd', fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  row: { flexDirection: 'row', gap: Spacing.sm },
  half: { flex: 1 },
  label: { fontSize: FontSize.xs, marginBottom: 4, fontWeight: FontWeight.medium },
  input: { borderWidth: 1, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs, fontSize: FontSize.sm, marginBottom: Spacing.sm },
  kvkkNote: { backgroundColor: '#172554', borderRadius: BorderRadius.md, padding: Spacing.sm, marginTop: Spacing.xs },
  kvkkText: { color: '#93c5fd', fontSize: FontSize.xs },
  processingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.sm },
  processingText: { fontSize: FontSize.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.base, marginVertical: Spacing.sm },
  score: { fontSize: 52, fontWeight: FontWeight.extrabold, lineHeight: 56 },
  scoreLabel: { fontSize: FontSize.xs },
  complianceLevel: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  location: { fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  issues: { gap: Spacing.xs, marginTop: Spacing.sm },
  issueTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.xs },
  issueRow: { borderWidth: 1, borderRadius: BorderRadius.md, padding: Spacing.sm, gap: 4 },
  issueSeverity: { fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  issueDesc: { fontSize: FontSize.sm },
  issueLegal: { fontSize: FontSize.xs, color: '#93c5fd' },
  issueRec: { fontSize: FontSize.xs, fontStyle: 'italic' },
  issueCost: { fontSize: FontSize.xs, color: '#fbbf24', fontWeight: FontWeight.semibold },
  issueConf: { fontSize: FontSize.xs },
  compliant: { fontSize: FontSize.base, fontWeight: FontWeight.semibold, marginTop: Spacing.sm },
});
