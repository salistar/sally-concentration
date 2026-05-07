/**
 * @file achievements.ts
 * @description Système d'achievements Concentration basé sur les parties
 * gagnées stockées localement.
 *
 * Stockage : `achievements:unlocked` = { id: timestamp }
 *           `replay:concentration:*` = JSON par partie
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'achievements:unlocked';
const REPLAY_PREFIX = 'replay:concentration:';

export interface ConcentrationWin {
  id: string;
  variantKey: string;
  pairsFound: number;
  moves: number;
  durationMs: number;
  wonAt: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  check: (wins: ConcentrationWin[]) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first-pair',
    title: 'Première Paire',
    description: 'Trouve ta toute première paire.',
    icon: 'heart',
    rarity: 'common',
    check: (rs) => rs.some((r) => r.pairsFound > 0),
  },
  {
    id: 'first-win',
    title: 'Première Victoire',
    description: 'Termine ta première partie.',
    icon: 'trophy',
    rarity: 'common',
    check: (rs) => rs.length >= 1,
  },
  {
    id: 'win-4x4',
    title: 'Mémoire vive',
    description: 'Termine une grille 4x4.',
    icon: 'grid',
    rarity: 'common',
    check: (rs) => rs.some((r) => r.variantKey === '4x4'),
  },
  {
    id: 'win-6x6',
    title: 'Concentration',
    description: 'Termine une grille 6x6.',
    icon: 'grid',
    rarity: 'rare',
    check: (rs) => rs.some((r) => r.variantKey === '6x6'),
  },
  {
    id: 'win-8x8',
    title: 'Méga-mémoire',
    description: 'Termine une grille 8x8.',
    icon: 'grid',
    rarity: 'epic',
    check: (rs) => rs.some((r) => r.variantKey === '8x8'),
  },
  {
    id: 'win-10x10',
    title: 'Cerveau de fer',
    description: 'Termine une grille 10x10.',
    icon: 'flash',
    rarity: 'legendary',
    check: (rs) => rs.some((r) => r.variantKey === '10x10'),
  },
  {
    id: 'no-mismatch',
    title: 'Sans erreur',
    description: 'Termine sans aucun retournement raté (moves = pairs * 2).',
    icon: 'sparkles',
    rarity: 'epic',
    check: (rs) => rs.some((r) => r.pairsFound > 0 && r.moves === r.pairsFound * 2),
  },
  {
    id: 'speedrun-30s',
    title: 'Sprinter',
    description: 'Termine un 4x4 en moins de 30 secondes.',
    icon: 'stopwatch',
    rarity: 'rare',
    check: (rs) => rs.some((r) => r.variantKey === '4x4' && r.durationMs > 0 && r.durationMs < 30_000),
  },
  {
    id: 'win-25',
    title: 'Vétéran',
    description: 'Gagne 25 parties (toutes grilles).',
    icon: 'medal',
    rarity: 'rare',
    check: (rs) => rs.length >= 25,
  },
  {
    id: 'all-grids',
    title: 'Polyvalent',
    description: 'Gagne au moins une fois dans chaque taille de grille.',
    icon: 'apps',
    rarity: 'epic',
    check: (rs) => {
      const grids = new Set(rs.map((r) => r.variantKey));
      return ['4x4', '6x6', '8x8', '10x10'].every((g) => grids.has(g));
    },
  },
];

export interface UnlockedAchievement extends Achievement {
  unlockedAt: number;
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

export async function evaluateAchievements(): Promise<{
  all: Achievement[];
  unlocked: Record<string, number>;
  newlyUnlocked: Achievement[];
}> {
  const wins = await listAllWins();
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  const unlocked: Record<string, number> = raw ? JSON.parse(raw) : {};
  const newlyUnlocked: Achievement[] = [];

  for (const ach of ACHIEVEMENTS) {
    if (unlocked[ach.id]) continue;
    if (ach.check(wins)) {
      unlocked[ach.id] = Date.now();
      newlyUnlocked.push(ach);
    }
  }

  if (newlyUnlocked.length > 0) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
  }

  return { all: ACHIEVEMENTS, unlocked, newlyUnlocked };
}

export async function getUnlockedAchievements(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
