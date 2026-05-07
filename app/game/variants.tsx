/**
 * @file game/variants.tsx — Sélecteur de variantes Concentration / Memory.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppHeader from '../../src/components/AppHeader';
import { useTheme } from '../../src/contexts/AppProviders';
import { APP_CONFIG } from '../../src/config/app.config';
import { VARIANTS, type Variant } from '../../src/game/variants';

const Stars = ({ count }: { count: number }) => (
  <Text style={{ fontSize: 12, color: '#F59E0B', letterSpacing: 1 }}>
    {'⭐'.repeat(count) + '☆'.repeat(5 - count)}
  </Text>
);

export default function VariantsScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const { t } = useTranslation();

  const goRules = (k: string) => router.push(`/game/rules?variant=${k}`);
  const lab = (v: Variant) => ({
    name: t(`variant.${v.key}.name`, { defaultValue: v.name }),
    shortDesc: t(`variant.${v.key}.shortDesc`, { defaultValue: v.shortDesc }),
  });

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <LinearGradient colors={palette.bgGradient as any} style={StyleSheet.absoluteFill} />
      <AppHeader title={t('variants.title') || 'Choix du Memory'} subtitle={t('variants.subtitle', { count: VARIANTS.length })} showBack />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={[styles.intro, { color: palette.textSecondary }]}>{t('variants.intro')}</Text>
        {VARIANTS.map((v) => {
          const l = lab(v);
          return (
            <TouchableOpacity key={v.key} onPress={() => goRules(v.key)} style={[styles.card, { borderColor: palette.border }]} activeOpacity={0.85}>
              <LinearGradient colors={[APP_CONFIG.primary + '22', palette.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.cardInner}>
                <View style={styles.cardLeft}><Text style={styles.cardEmoji}>{v.emoji}</Text></View>
                <View style={styles.cardMid}>
                  <Text style={[styles.cardTitle, { color: palette.text }]}>{l.name}</Text>
                  <Text style={[styles.cardDesc, { color: palette.textSecondary }]} numberOfLines={2}>{l.shortDesc}</Text>
                  <View style={styles.cardMeta}>
                    <Stars count={v.difficulty} />
                    <Text style={[styles.metaItem, { color: palette.textSecondary }]}>🏆 {v.winRate}</Text>
                    <Text style={[styles.metaItem, { color: palette.textSecondary }]}>⏱ {v.duration}</Text>
                    <Text style={[styles.metaItem, { color: palette.textSecondary }]}>🎴 {v.cards}</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={22} color={palette.textSecondary} />
              </LinearGradient>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 14, paddingBottom: 40 },
  intro: { fontSize: 13, fontFamily: 'Inter-Regular', lineHeight: 20, marginBottom: 14 },
  card: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  cardInner: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  cardLeft: { width: 40, alignItems: 'center' },
  cardEmoji: { fontSize: 30 },
  cardMid: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 15, fontFamily: 'Inter-Black', letterSpacing: 0.5, flexShrink: 1 },
  cardDesc: { fontSize: 12, fontFamily: 'Inter-Regular', lineHeight: 16 },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, alignItems: 'center' },
  metaItem: { fontSize: 11, fontFamily: 'Inter-SemiBold' },
});
