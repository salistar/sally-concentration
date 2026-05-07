/**
 * @file daily-challenge.tsx
 * @description Défi quotidien Concentration — grille déterministe (4×4 sur
 * la base du jour) pour challenger toute la communauté chaque jour.
 */

import React, { useMemo, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AppHeader from '../src/components/AppHeader';
import { useTheme } from '../src/contexts/AppProviders';
import { markDailyReminderShown } from '../src/game/daily-reminder';

const VARIANTS = ['4x4', '6x6', '8x8'];

function todaySeed(): { dateKey: string; variant: string; seed: number } {
  const d = new Date();
  const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let h = 0;
  for (let i = 0; i < dateKey.length; i++) h = (h * 31 + dateKey.charCodeAt(i)) >>> 0;
  return { dateKey, variant: VARIANTS[h % VARIANTS.length], seed: h };
}

export default function DailyChallengeScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const seed = useMemo(() => todaySeed(), []);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    markDailyReminderShown().finally(() => setShown(true));
  }, []);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <AppHeader title="Défi du jour" showBack />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: palette.card, borderColor: palette.border }]}>
          <Ionicons name="calendar" size={28} color="#F59E0B" />
          <Text style={[styles.date, { color: palette.text }]}>{seed.dateKey}</Text>
          <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
            Grille du jour : {seed.variant}. Mémorise vite !
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: palette.accent }]}
          onPress={() => router.push({
            pathname: '/game/local',
            params: { variant: seed.variant, dailySeed: String(seed.seed) },
          })}
        >
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={styles.btnLabel}>Commencer le défi</Text>
        </TouchableOpacity>
        {shown && (
          <Text style={[styles.note, { color: palette.textSecondary }]}>
            Reviens demain pour un nouveau défi.
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 16, gap: 16 },
  card: {
    padding: 20, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', gap: 8,
  },
  date: { fontSize: 18, fontWeight: '700' },
  subtitle: { fontSize: 14, textAlign: 'center' },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, padding: 16, borderRadius: 12,
  },
  btnLabel: { color: '#fff', fontSize: 16, fontWeight: '700' },
  note: { fontSize: 12, textAlign: 'center', fontStyle: 'italic' },
});
