/**
 * @file game/rules.tsx — Détaille les règles d'une variante Memory.
 */
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import AppHeader from '../../src/components/AppHeader';
import { useTheme } from '../../src/contexts/AppProviders';
import { APP_CONFIG } from '../../src/config/app.config';
import { findVariant } from '../../src/game/variants';

export default function RulesScreen() {
  const { variant } = useLocalSearchParams<{ variant: string }>();
  const router = useRouter();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const v = findVariant(variant ?? 'classic-4x4');

  if (!v) {
    return (
      <View style={[styles.root, { backgroundColor: palette.bg }]}>
        <AppHeader title={t('rules.notFoundTitle')} showBack />
        <Text style={{ color: palette.text, padding: 20 }}>{t('rules.notFoundBody')}</Text>
      </View>
    );
  }

  const name = t(`variant.${v.key}.name`, { defaultValue: v.name });
  const shortDesc = t(`variant.${v.key}.shortDesc`, { defaultValue: v.shortDesc });
  const isMulti = !!v.options?.multi;
  const play = () => {
    if (isMulti) router.push('/room/create');         // multi → lobby
    else router.push(`/game/solo?variant=${v.key}`);  // solo
  };

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <LinearGradient colors={palette.bgGradient as any} style={StyleSheet.absoluteFill} />
      <AppHeader title={name} subtitle={shortDesc} showBack />
      <ScrollView contentContainerStyle={styles.body}>
        <LinearGradient colors={[APP_CONFIG.primary + '33', palette.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.hero, { borderColor: palette.border }]}>
          <Text style={styles.heroEmoji}>{v.emoji}</Text>
          <Text style={[styles.heroName, { color: palette.text }]}>{name}</Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>{t('rules.metaDifficulty')}</Text>
              <Text style={[styles.metaValue, { color: '#F59E0B' }]}>{'⭐'.repeat(v.difficulty)}{'☆'.repeat(5 - v.difficulty)}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>{t('rules.metaWin')}</Text>
              <Text style={[styles.metaValue, { color: '#10B981' }]}>{v.winRate}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>{t('rules.metaDuration')}</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>{v.duration}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={[styles.metaLabel, { color: palette.textSecondary }]}>{t('rules.metaCards')}</Text>
              <Text style={[styles.metaValue, { color: palette.text }]}>{v.cards}</Text>
            </View>
          </View>
        </LinearGradient>

        <Text style={[styles.sectionTitle, { color: palette.text }]}>{t('rules.sectionTitle')}</Text>
        {v.rules.map((rule, i) => {
          const rt = t(`variant.${v.key}.rules.${i}.title`, { defaultValue: rule.title });
          const rb = t(`variant.${v.key}.rules.${i}.body`, { defaultValue: rule.body });
          return (
            <LinearGradient key={i} colors={[palette.card, 'rgba(0,0,0,0.0)']} style={[styles.ruleCard, { borderColor: palette.border }]}>
              <View style={styles.ruleHeader}>
                <View style={[styles.ruleNumber, { backgroundColor: APP_CONFIG.primary }]}><Text style={styles.ruleNumberText}>{i + 1}</Text></View>
                <Text style={[styles.ruleTitle, { color: palette.text }]}>{rt}</Text>
              </View>
              <Text style={[styles.ruleBody, { color: palette.textSecondary }]}>{rb}</Text>
            </LinearGradient>
          );
        })}

        <TouchableOpacity onPress={play} style={[styles.playBtn, { backgroundColor: APP_CONFIG.primary }]} activeOpacity={0.85}>
          <Ionicons name="play" size={22} color="#fff" />
          <Text style={styles.playText}>{isMulti ? t('rules.playMulti') : t('rules.playNow')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { borderColor: palette.border }]}>
          <Ionicons name="arrow-back" size={16} color={palette.text} />
          <Text style={[styles.backText, { color: palette.text }]}>{t('rules.chooseAnother')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 14, paddingBottom: 40 },
  hero: { padding: 18, borderRadius: 16, borderWidth: 1, alignItems: 'center', marginBottom: 18 },
  heroEmoji: { fontSize: 56, marginBottom: 8 },
  heroName: { fontSize: 22, fontFamily: 'Inter-Black', letterSpacing: 0.5, marginBottom: 12 },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', width: '100%', gap: 10 },
  metaItem: { alignItems: 'center', flex: 1, minWidth: 70 },
  metaLabel: { fontSize: 9, fontFamily: 'Inter-Bold', letterSpacing: 1 },
  metaValue: { fontSize: 14, fontFamily: 'Inter-Black', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter-Black', marginBottom: 10 },
  ruleCard: { padding: 14, borderRadius: 12, borderWidth: 1, marginBottom: 8 },
  ruleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  ruleNumber: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  ruleNumberText: { color: '#fff', fontSize: 11, fontFamily: 'Inter-Black' },
  ruleTitle: { fontSize: 14, fontFamily: 'Inter-Bold', flex: 1 },
  ruleBody: { fontSize: 13, fontFamily: 'Inter-Regular', lineHeight: 19, marginLeft: 34 },
  playBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16, borderRadius: 14, marginTop: 18 },
  playText: { color: '#fff', fontSize: 16, fontFamily: 'Inter-Black', letterSpacing: 0.5 },
  backBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, marginTop: 12 },
  backText: { fontSize: 13, fontFamily: 'Inter-SemiBold' },
});
