/**
 * @file game/solo.tsx — Écran de jeu solo Memory / Concentration.
 * Multiplexe selon la variante (toutes les variantes solo utilisent memoryEngineV2).
 * Pour les variantes multi (cooperative-2v2, vol-multi), le flow passe par /room/create
 * (sockets+STUN/TURN+Jitsi inchangés).
 */
import React, { useReducer, useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Pressable, Modal } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import AppHeader from '../../src/components/AppHeader';
import { useTheme } from '../../src/contexts/AppProviders';
import { logger } from '../../src/utils/logger';
import { APP_CONFIG } from '../../src/config/app.config';
import { findVariant } from '../../src/game/variants';
import { createInitialState, gameReducer, scoreFor, isStuck, type GameState } from '../../src/game/memoryEngineV2';
import * as api from '../../shared/api';

const log = logger.scoped('MemorySolo');

export default function SoloMemoryScreen() {
  const { variant } = useLocalSearchParams<{ variant: string }>();
  const router = useRouter();
  const { palette } = useTheme();
  const { t } = useTranslation();
  const v = findVariant(variant ?? 'classic-4x4');

  if (!v || !v.available || v.options?.multi) {
    return (
      <View style={[styles.root, { backgroundColor: palette.bg }]}>
        <AppHeader title={t('solo.unavailableTitle')} showBack />
        <Text style={{ color: palette.text, padding: 20 }}>{t('solo.unavailableBody')}</Text>
      </View>
    );
  }

  const opts = v.options!;
  const initial = (): GameState => createInitialState({
    rows: opts.rows!, cols: opts.cols!, matchSize: opts.matchSize ?? 2,
    preview: opts.preview, seedDaily: opts.seedDaily,
    inverse: v.engine === 'inverse',
  });
  const [state, dispatch] = useReducer(gameReducer, undefined, initial);
  const [showWin, setShowWin] = useState(false);
  const [showStuck, setShowStuck] = useState(false);
  const startedAt = useRef(Date.now());
  // Limites optionnelles selon variante
  const stuckOpts = {
    timeLimitMs: opts.timed ? 180_000 : undefined,
    maxMoves: opts.coop ? 60 : undefined,
  };

  // preview countdown
  useEffect(() => {
    if (state.phase === 'preview' && opts.preview) {
      // Show all faceUp during preview
      // Then end preview after `opts.preview` ms
      const t1 = setTimeout(() => dispatch({ type: 'END_PREVIEW' }), opts.preview);
      return () => clearTimeout(t1);
    }
  }, [state.phase, opts.preview]);

  // Hide unmatched after a short delay
  useEffect(() => {
    if (state.flippedIndices.length === state.matchSize) {
      const ids = state.flippedIndices.map((i) => state.grid[i].card.groupKey);
      const allSame = ids.every((g) => g === ids[0]);
      if (!allSame) {
        const t1 = setTimeout(() => dispatch({ type: 'HIDE_UNMATCHED' }), 900);
        return () => clearTimeout(t1);
      }
    }
  }, [state.flippedIndices, state.matchSize]);

  // tick
  useEffect(() => {
    if (state.phase !== 'playing') return;
    const id = setInterval(() => dispatch({ type: 'TICK', ms: 1000 }), 1000);
    return () => clearInterval(id);
  }, [state.phase]);

  const won = state.phase === 'won';
  useEffect(() => {
    if (!won) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setShowWin(true);
    const score = scoreFor(state);
    saveResult({ gameType: 'concentration', variant: v.key, score, moves: state.moves, durationMs: Date.now() - startedAt.current, won: true });
  }, [won]);

  // Détection blocage (timeout ou maxMoves)
  useEffect(() => {
    if (won || showStuck) return;
    if (isStuck(state, stuckOpts)) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setShowStuck(true);
      saveResult({ gameType: 'concentration', variant: v.key, score: scoreFor(state), moves: state.moves, durationMs: Date.now() - startedAt.current, won: false });
    }
  }, [state, showStuck, won]);

  const onCellPress = (idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    dispatch({ type: 'FLIP', index: idx });
  };

  const reset = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    dispatch({ type: 'RESET' });
    setShowWin(false);
    startedAt.current = Date.now();
  };

  const seconds = Math.floor(state.durationMs / 1000);

  // compute card width based on cols and inverse mode (longer labels)
  const isInverse = v.engine === 'inverse';
  const cardW = isInverse ? Math.max(56, Math.floor(320 / opts.cols!)) : Math.max(46, Math.floor(320 / opts.cols!));
  const cardH = Math.floor(cardW * 1.35);

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <LinearGradient colors={palette.bgGradient as any} style={StyleSheet.absoluteFill} />
      <AppHeader
        title={t(`variant.${v.key}.name`, { defaultValue: v.name })}
        subtitle={t('solo.subtitle', { rows: opts.rows, cols: opts.cols, matches: state.totalMatches })}
        showBack
      />
      <ScrollView contentContainerStyle={styles.body}>
        <LinearGradient colors={[APP_CONFIG.primary + '33', palette.card]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.banner, { borderColor: palette.border }]}>
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerLabel, { color: palette.textSecondary }]}>{t('solo.moves')}</Text>
            <Text style={[styles.bannerValue, { color: palette.text }]}>{state.moves}</Text>
          </View>
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerLabel, { color: palette.textSecondary }]}>{t('solo.matches')}</Text>
            <Text style={[styles.bannerValue, { color: APP_CONFIG.primary }]}>{state.matchCount} / {state.totalMatches}</Text>
          </View>
          <View style={styles.bannerStat}>
            <Text style={[styles.bannerLabel, { color: palette.textSecondary }]}>{t('solo.time')}</Text>
            <Text style={[styles.bannerValue, { color: palette.text }]}>{seconds}s</Text>
          </View>
        </LinearGradient>

        {state.phase === 'preview' && (
          <View style={[styles.preview, { borderColor: APP_CONFIG.primary }]}>
            <Ionicons name="eye" size={18} color={APP_CONFIG.primary} />
            <Text style={[styles.previewText, { color: APP_CONFIG.primary }]}>{t('solo.previewMode')}</Text>
          </View>
        )}

        <View style={[styles.grid, { width: opts.cols! * (cardW + 6) }]}>
          {state.grid.map((slot, i) => {
            const isUp = slot.faceUp || state.phase === 'preview';
            return (
              <Pressable key={slot.card.id + i} onPress={() => onCellPress(i)}
                style={[styles.cell, { width: cardW, height: cardH, borderColor: palette.border, opacity: slot.matched ? 0.35 : 1 }, isUp && { backgroundColor: APP_CONFIG.primary + '22' }]}>
                {isUp ? (
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: isInverse ? 22 : 32 }}>{slot.card.emoji ?? '?'}</Text>
                    {isInverse && (
                      <Text style={{ color: palette.text, fontSize: 9, fontFamily: 'Inter-Bold', marginTop: 2 }}>{slot.card.label}</Text>
                    )}
                  </View>
                ) : (
                  <View style={[styles.back, { backgroundColor: APP_CONFIG.secondary }]}>
                    <Text style={{ color: '#fff', fontSize: 22 }}>?</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity onPress={reset} style={[styles.btn, { backgroundColor: APP_CONFIG.primary }]}>
            <Ionicons name="refresh" size={16} color="#fff" />
            <Text style={styles.btnText}>{t('solo.restart')}</Text>
          </TouchableOpacity>
        </View>
        <View style={[styles.hint, { borderColor: palette.border }]}>
          <Ionicons name="information-circle-outline" size={14} color={palette.textSecondary} />
          <Text style={[styles.hintText, { color: palette.textSecondary }]}>{t(isInverse ? 'solo.hintInverse' : opts.matchSize === 3 ? 'solo.hintTriplet' : 'solo.hintPair')}</Text>
        </View>
      </ScrollView>

      <Modal visible={showStuck} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={['#7F1D1D', '#1F1216']} style={[styles.modalCard, { borderColor: '#EF4444' }]}>
            <Text style={{ fontSize: 56 }}>⏱️</Text>
            <Text style={styles.modalTitle}>{t('stuck.title')}</Text>
            <Text style={[styles.modalSub, { textAlign: 'center', paddingHorizontal: 8 }]}>{t('stuck.body')}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 18, flexWrap: 'wrap', justifyContent: 'center' }}>
              <TouchableOpacity onPress={() => { setShowStuck(false); reset(); }} style={[styles.modalBtn, { backgroundColor: '#EF4444' }]}>
                <Text style={styles.modalBtnText}>🔄 {t('stuck.again')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowStuck(false)} style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={styles.modalBtnText}>{t('stuck.continue')}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>

      <Modal visible={showWin} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={['#0A0A1A', APP_CONFIG.secondary]} style={[styles.modalCard, { borderColor: APP_CONFIG.primary }]}>
            <Text style={{ fontSize: 56 }}>🏆</Text>
            <Text style={styles.modalTitle}>{t('solo.winTitle')}</Text>
            <Text style={styles.modalSub}>{t('solo.winStats', { moves: state.moves, time: seconds, score: scoreFor(state) })}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <TouchableOpacity onPress={reset} style={[styles.modalBtn, { backgroundColor: APP_CONFIG.primary }]}>
                <Text style={styles.modalBtnText}>🔄 {t('solo.playAgain')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <Text style={styles.modalBtnText}>{t('solo.quit')}</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

async function saveResult(p: { gameType: string; variant: string; score: number; moves: number; durationMs: number; won: boolean }) {
  try {
    const r = await api.saveSoloGame(p);
    log.bout(`persist via ${r.via}`, { persisted: r.persisted });
  } catch (e: any) {
    log.error('persist failed', e?.message);
  }
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { padding: 12, paddingBottom: 40, alignItems: 'center' },
  banner: { flexDirection: 'row', justifyContent: 'space-around', borderRadius: 14, padding: 12, borderWidth: 1, marginBottom: 12, width: '100%' },
  bannerStat: { alignItems: 'center', flex: 1 },
  bannerLabel: { fontSize: 9, fontFamily: 'Inter-Bold', letterSpacing: 1 },
  bannerValue: { fontSize: 18, fontFamily: 'Inter-Black', marginTop: 4 },
  preview: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginBottom: 8 },
  previewText: { fontSize: 12, fontFamily: 'Inter-Bold' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center', alignSelf: 'center' },
  cell: { borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  back: { flex: 1, alignSelf: 'stretch', borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 16, justifyContent: 'center' },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  btnText: { color: '#fff', fontSize: 13, fontFamily: 'Inter-Bold' },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, padding: 10, borderRadius: 10, borderWidth: 1, marginTop: 10, backgroundColor: 'rgba(255,255,255,0.03)' },
  hintText: { flex: 1, fontSize: 11, fontFamily: 'Inter-Regular', lineHeight: 15 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { padding: 28, borderRadius: 20, alignItems: 'center', borderWidth: 2, minWidth: 280 },
  modalTitle: { color: '#fff', fontSize: 22, fontFamily: 'Inter-Black', marginTop: 8 },
  modalSub: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontFamily: 'Inter-SemiBold', marginTop: 6 },
  modalBtn: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 12 },
  modalBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter-Bold' },
});
