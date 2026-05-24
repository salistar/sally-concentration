/**
 * @file game/[roomCode].tsx
 * @description Table Concentration (memory) multijoueur — client MINCE du gateway
 *   /game AUTORITATIF (gameType 'concentration'). Bots + tours gérés SERVEUR.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, useWindowDimensions } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { io, Socket } from 'socket.io-client';
import AppHeader from '../../src/components/AppHeader';
import P2PCall from '../../src/components/P2PCall';
import Chat from '../../src/components/Chat';
import { useTheme } from '../../src/contexts/AppProviders';
import { logger } from '../../src/utils/logger';
import { APP_CONFIG } from '../../src/config/app.config';
import { SOCKET_URL } from '../../shared/api';
import * as api from '../../shared/api';

const log = logger.scoped('ConcentrationRoom');
const GOLD = '#FCD34D';

interface Cell { id: string; faceUp?: boolean; matched?: boolean; owner?: string | null; symbol?: string | null }
interface SeatPlayer { id: string; name: string; isBot: boolean; pairs: number }
interface Snapshot {
  youId: string; phase: 'playing' | 'over'; step?: string; turn?: number; currentId: string | null;
  rows?: number; cols?: number; totalPairs?: number; winner?: number | null;
  lastEvent?: string; log?: string[]; players: SeatPlayer[]; grid: Cell[];
}

async function ensureToken(): Promise<string | null> {
  if (api.getAuthToken()) return api.getAuthToken();
  try { await api.createGuestSession(); } catch (e) { log.warn('guest failed', (e as any)?.message); }
  return api.getAuthToken();
}
async function refreshAuth(): Promise<string | null> {
  try { await api.refreshTokenAsync(); } catch { try { await api.createGuestSession(); } catch {} }
  return api.getAuthToken();
}

export default function ConcentrationRoomScreen() {
  const { roomCode } = useLocalSearchParams<{ roomCode: string }>();
  const code = (roomCode || '').toString().toUpperCase();
  const router = useRouter();
  const { palette } = useTheme();
  const { width } = useWindowDimensions();
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const [showQuit, setShowQuit] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const tokenRef = useRef<string | null>(api.getAuthToken());

  useEffect(() => {
    if (!code) return;
    let cancelled = false;
    (async () => {
      await ensureToken();
      if (cancelled) return;
      tokenRef.current = api.getAuthToken();
      const s = io(`${SOCKET_URL}/game`, { transports: ['websocket'], timeout: 8000, auth: (cb: (d: any) => void) => cb({ token: tokenRef.current }) });
      socketRef.current = s;
      s.on('connect', () => { setConnected(true); s.emit('game:join', { roomCode: code, gameType: 'concentration' }); });
      s.on('disconnect', () => setConnected(false));
      s.on('game:state', (snapshot: Snapshot) => setSnap(snapshot));
      s.on('game:error', (e: any) => log.warn('game:error', e?.message));
      s.on('connect_error', async (e: any) => { if (/token|auth|jwt|unauthor/i.test(e?.message || '')) { await refreshAuth(); tokenRef.current = api.getAuthToken(); } });
    })();
    return () => { cancelled = true; socketRef.current?.disconnect(); socketRef.current = null; };
  }, [code]);

  const me = snap?.players.find((p) => p.id === snap.youId) || null;
  const myTurn = !!(snap && me && snap.phase === 'playing' && snap.currentId === me.id);
  const isOver = snap?.phase === 'over';

  const emitAction = useCallback((action: any) => { socketRef.current?.emit('game:action', { roomCode: code, action }); }, [code]);
  const flip = useCallback((index: number) => { if (!myTurn) return; Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}); emitAction({ type: 'FLIP', index }); }, [myTurn, emitAction]);
  const rematch = useCallback(() => { socketRef.current?.emit('game:start', { roomCode: code }); }, [code]);
  useEffect(() => { if (isOver) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}); }, [isOver]);

  const styles = createStyles(palette);
  const cols = snap?.cols || 4;
  const cellSize = Math.floor((width - 28 - (cols + 1) * 8) / cols);

  return (
    <View style={styles.root}>
      <LinearGradient colors={palette.bgGradient} style={StyleSheet.absoluteFill} />
      <AppHeader title={APP_CONFIG.name} subtitle={`Salon ${code || '—'} ${connected ? '· 🟢' : '· 🔌'}`} showBack onBack={() => setShowQuit(true)} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.commsRow}>
          <TouchableOpacity onPress={() => setVoiceOpen((v) => !v)} style={[styles.commsBtn, voiceOpen && styles.commsBtnActive]}><Ionicons name="videocam" size={16} color="#fff" /><Text style={styles.commsBtnText}>📹 Appel</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => setChatOpen((v) => !v)} style={[styles.commsBtn, chatOpen && styles.commsBtnActive]}><Ionicons name="chatbubbles" size={16} color="#fff" /><Text style={styles.commsBtnText}>💬 Chat</Text></TouchableOpacity>
        </View>
        {voiceOpen && <View style={{ marginBottom: 12 }}><P2PCall compact roomCode={`concentration-${code}`} displayName={me?.name ?? 'Joueur'} authToken={api.getAuthToken() ?? ''} onClose={() => setVoiceOpen(false)} /></View>}
        {chatOpen && <View style={{ marginBottom: 12 }}><Chat roomId={`concentration-${code}`} token={api.getAuthToken()} onClose={() => setChatOpen(false)} /></View>}

        {snap && (
          <View style={styles.playersRow}>
            {snap.players.map((p) => {
              const active = snap.currentId === p.id && snap.phase === 'playing';
              return (
                <View key={p.id} style={[styles.playerCard, active && styles.playerCardActive]}>
                  <Text style={styles.playerName} numberOfLines={1}>{p.id === snap.youId ? '🧑 Vous' : (p.isBot ? '🤖 ' + p.name : '🧑 ' + p.name)}</Text>
                  <Text style={styles.playerScore}>{p.pairs}<Text style={styles.playerScoreSub}> paires</Text></Text>
                </View>
              );
            })}
          </View>
        )}

        {snap && <Text style={[styles.eventText, { color: palette.textSecondary }]}>{isOver ? (snap.lastEvent || 'Partie terminée') : myTurn ? 'À toi : retourne une carte.' : (snap.lastEvent || 'Tour de l’adversaire…')}</Text>}

        {!snap && <View style={styles.empty}><Text style={styles.emptyText}>{connected ? 'Préparation…' : 'Connexion à la room…'}</Text></View>}
        {snap && (
          <View style={styles.grid}>
            {snap.grid.map((cell, index) => {
              const revealed = cell.faceUp || cell.matched;
              return (
                <TouchableOpacity
                  key={cell.id ?? index}
                  activeOpacity={0.8}
                  disabled={!myTurn || revealed}
                  onPress={() => flip(index)}
                  style={[styles.cell, { width: cellSize, height: Math.round(cellSize * 1.2) }, revealed ? styles.cellUp : styles.cellDown, cell.matched && styles.cellMatched]}
                >
                  <Text style={{ fontSize: Math.round(cellSize * 0.5) }}>{revealed ? (cell.symbol || '❔') : '❓'}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {snap && (snap.log || []).length > 0 && (
          <View style={styles.logBox}>{(snap.log || []).slice(0, 5).map((l, i) => <Text key={i} style={[styles.logLine, { color: i === 0 ? palette.text : palette.textSecondary }]} numberOfLines={1}>{l}</Text>)}</View>
        )}
      </ScrollView>

      <Modal visible={isOver} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <LinearGradient colors={['#0A0A1A', palette.card]} style={[styles.modalCard, { borderColor: GOLD }]}>
            <Text style={styles.modalEmoji}>🏆</Text>
            <Text style={styles.modalTitle}>{snap && snap.winner != null ? `${snap.players[snap.winner]?.name} gagne` : 'Fin de partie'}</Text>
            <Text style={[styles.modalSub, { color: palette.textSecondary }]} numberOfLines={2}>{snap?.players.map((p) => `${p.name}: ${p.pairs}`).join(' · ')}</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
              <TouchableOpacity onPress={rematch} style={[styles.modalBtn, { backgroundColor: APP_CONFIG.primary }]}><Ionicons name="refresh" size={18} color="#fff" /><Text style={styles.modalBtnText}>Rejouer</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}><Text style={styles.modalBtnText}>Quitter</Text></TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      </Modal>
      <Modal visible={showQuit} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: palette.card, borderColor: palette.border }]}>
            <Text style={styles.modalTitle}>Quitter la partie ?</Text>
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 18 }}>
              <TouchableOpacity onPress={() => setShowQuit(false)} style={[styles.modalBtn, { backgroundColor: 'rgba(255,255,255,0.15)' }]}><Text style={styles.modalBtnText}>Annuler</Text></TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowQuit(false); router.back(); }} style={[styles.modalBtn, { backgroundColor: '#EF4444' }]}><Text style={styles.modalBtnText}>Quitter</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(palette: ReturnType<typeof useTheme>['palette']) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: palette.bg },
    body: { padding: 14, paddingBottom: 40 },
    commsRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    commsBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10, backgroundColor: APP_CONFIG.primary },
    commsBtnActive: { backgroundColor: '#7C3AED' },
    commsBtnText: { color: '#fff', fontFamily: 'Inter-Bold', fontSize: 14 },
    playersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
    playerCard: { flex: 1, minWidth: 100, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 12, padding: 10 },
    playerCardActive: { backgroundColor: 'rgba(252,211,77,0.16)', borderColor: GOLD },
    playerName: { color: '#fff', fontSize: 11, fontFamily: 'Inter-Bold' },
    playerScore: { color: GOLD, fontFamily: 'Inter-Black', fontSize: 20, marginTop: 2 },
    playerScoreSub: { color: palette.textSecondary, fontSize: 10, fontFamily: 'Inter-SemiBold' },
    eventText: { fontSize: 13, fontFamily: 'Inter-SemiBold', marginBottom: 8, minHeight: 18 },
    empty: { padding: 30, alignItems: 'center' },
    emptyText: { color: palette.textSecondary, fontFamily: 'Inter-Bold' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    cell: { borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    cellDown: { backgroundColor: '#1e3a8a', borderColor: 'rgba(255,255,255,0.25)' },
    cellUp: { backgroundColor: '#fff', borderColor: 'rgba(0,0,0,0.2)' },
    cellMatched: { backgroundColor: '#bbf7d0', borderColor: '#16A34A' },
    logBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginTop: 14 },
    logLine: { fontSize: 12, fontFamily: 'Inter-Regular', paddingVertical: 1 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' },
    modalCard: { padding: 26, borderRadius: 20, alignItems: 'center', borderWidth: 2, minWidth: 290, maxWidth: '85%' },
    modalEmoji: { fontSize: 52, marginBottom: 6 },
    modalTitle: { color: '#fff', fontSize: 20, fontFamily: 'Inter-Black', letterSpacing: 0.3, textAlign: 'center' },
    modalSub: { fontSize: 13, fontFamily: 'Inter-SemiBold', marginTop: 6, textAlign: 'center' },
    modalBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
    modalBtnText: { color: '#fff', fontSize: 14, fontFamily: 'Inter-Bold' },
  });
}
