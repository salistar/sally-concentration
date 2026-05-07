/**
 * @file concentration-elo.ts
 * @description Système ELO Concentration — basé sur parties gagnées avec
 * bonus pour faible nombre de retournements et rapidité.
 *
 * Formule :
 *   - ELO de base : 1000
 *   - Victoire 10x10 : +30
 *   - Victoire 8x8 : +20
 *   - Victoire 6x6 : +12
 *   - Victoire 4x4 : +5
 *   - Bonus moves < pairs * 2.5 (proche du sans-erreur) : +15
 *   - Bonus speedrun (< best * 1.3) : +5
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_ELO = 1000;
const REPLAY_PREFIX = 'replay:concentration:';

const WIN_GAIN: Record<string, number> = {
  '4x4': 5,
  '6x6': 12,
  '8x8': 20,
  '10x10': 30,
};

const VARIANTS = ['4x4', '6x6', '8x8', '10x10'];

interface ConcentrationWin {
  variantKey: string;
  pairsFound: number;
  moves: number;
  durationMs: number;
  wonAt: number;
}

export interface VariantElo {
  variant: string;
  elo: number;
  wins: number;
  history: { date: number; elo: number; gain: number; reason: string }[];
}

async function listAllWins(): Promise<ConcentrationWin[]> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const replayKeys = keys.filter((k) => k.startsWith(REPLAY_PREFIX));
    const items = await AsyncStorage.multiGet(replayKeys);
    return items
      .map(([_, v]) => { try { return JSON.parse(v ?? ''); } catch { return null; } })
      .filter((x): x is ConcentrationWin => !!x && typeof x.moves === 'number');
  } catch {
    return [];
  }
}

export async function computeEloByVariant(): Promise<Record<string, VariantElo>> {
  const wins = await listAllWins();
  wins.sort((a, b) => a.wonAt - b.wonAt);

  const out: Record<string, VariantElo> = {};
  for (const v of VARIANTS) out[v] = { variant: v, elo: BASE_ELO, wins: 0, history: [] };

  const bestDurByVariant: Record<string, number> = {};
  for (const r of wins) {
    if (!out[r.variantKey] || r.durationMs <= 0) continue;
    if (!bestDurByVariant[r.variantKey] || r.durationMs < bestDurByVariant[r.variantKey]) {
      bestDurByVariant[r.variantKey] = r.durationMs;
    }
  }

  for (const r of wins) {
    const v = out[r.variantKey];
    if (!v) continue;
    let gain = WIN_GAIN[r.variantKey] ?? 10;
    let reason = `Win ${r.variantKey}`;

    if (r.pairsFound > 0 && r.moves <= r.pairsFound * 2.5) {
      gain += 15;
      reason += ' +memory';
    }

    if (bestDurByVariant[r.variantKey] && r.durationMs > 0 && r.durationMs < bestDurByVariant[r.variantKey] * 1.3) {
      gain += 5;
      reason += ' +speed';
    }

    v.elo += gain;
    v.wins++;
    v.history.push({ date: r.wonAt, elo: v.elo, gain, reason });
  }

  return out;
}

export async function computeGlobalElo(): Promise<number> {
  const eloMap = await computeEloByVariant();
  const played = Object.values(eloMap).filter((v) => v.wins > 0);
  if (played.length === 0) return BASE_ELO;
  const sum = played.reduce((a, b) => a + b.elo, 0);
  return Math.round(sum / played.length);
}

export function rankFromElo(elo: number): { tier: string; color: string; emoji: string } {
  if (elo >= 2500) return { tier: 'Diamond', color: '#06B6D4', emoji: '💎' };
  if (elo >= 2000) return { tier: 'Platinum', color: '#A855F7', emoji: '🏆' };
  if (elo >= 1500) return { tier: 'Gold', color: '#F59E0B', emoji: '🥇' };
  if (elo >= 1200) return { tier: 'Silver', color: '#94A3B8', emoji: '🥈' };
  return { tier: 'Bronze', color: '#92400E', emoji: '🥉' };
}
