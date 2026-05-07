/**
 * @file memoryEngineV2.ts — Flexible Memory engine for all variants.
 * Supports pairs (matchSize=2) and triplets (matchSize=3), variable grid,
 * preview phase, daily seed, inverse-pairs (complementary matching).
 */

export interface CardItem {
  id: string;          // unique
  groupKey: string;    // shared by cards that match together
  label: string;       // text shown when face-up
  emoji?: string;
}

export interface GridSlot {
  card: CardItem;
  faceUp: boolean;
  matched: boolean;
}

export interface GameState {
  rows: number;
  cols: number;
  matchSize: 2 | 3;
  grid: GridSlot[];
  flippedIndices: number[];
  matchCount: number;
  totalMatches: number;
  moves: number;
  durationMs: number;
  startedAt: number;
  preview: boolean;
  phase: 'preview' | 'playing' | 'won';
}

export type GameAction =
  | { type: 'FLIP'; index: number }
  | { type: 'CHECK' }
  | { type: 'HIDE_UNMATCHED' }
  | { type: 'END_PREVIEW' }
  | { type: 'TICK'; ms: number }
  | { type: 'RESET' };

export interface VariantOptions {
  rows: number;
  cols: number;
  matchSize: 2 | 3;
  preview?: number;
  seedDaily?: boolean;
  inverse?: boolean;       // pairs by complementary mapping
  symbols?: string[];      // override default emoji set
}

const DEFAULT_SYMBOLS = [
  '🍎','🍌','🍇','🍊','🍓','🍒','🍑','🍐','🥝','🍍',
  '🥑','🌽','🥕','🌶️','🥦','🍆','🥬','🧄','🧅','🥔',
  '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
  '🐮','🐷','🐸','🐵','🐔','🐧','🦆','🦅','🦉','🦇',
  '⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸',
  '🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐',
  '🌹','🌻','🌷','🌸','🌼','🪷','🌺','💐','🍀','🌿',
];

/** Inverse-pairs example mapping (could be replaced by real lessons). */
const INVERSE_PAIRS: { a: { label: string; emoji: string }; b: { label: string; emoji: string } }[] = [
  { a: { label: 'France', emoji: '🇫🇷' }, b: { label: 'Paris', emoji: '🗼' } },
  { a: { label: 'Maroc',  emoji: '🇲🇦' }, b: { label: 'Rabat', emoji: '🕌' } },
  { a: { label: 'Égypte', emoji: '🇪🇬' }, b: { label: 'Caire', emoji: '🏯' } },
  { a: { label: 'Japon',  emoji: '🇯🇵' }, b: { label: 'Tokyo', emoji: '🗾' } },
  { a: { label: 'USA',    emoji: '🇺🇸' }, b: { label: 'Wash.', emoji: '🗽' } },
  { a: { label: 'Italie', emoji: '🇮🇹' }, b: { label: 'Rome',  emoji: '🏛️' } },
  { a: { label: 'Russie', emoji: '🇷🇺' }, b: { label: 'Moscou',emoji: '🏰' } },
  { a: { label: 'Brésil', emoji: '🇧🇷' }, b: { label: 'Brasilia', emoji: '⚽' } },
  { a: { label: 'Chine',  emoji: '🇨🇳' }, b: { label: 'Pékin', emoji: '🏯' } },
  { a: { label: 'Allem.', emoji: '🇩🇪' }, b: { label: 'Berlin',emoji: '🏛️' } },
  { a: { label: 'Espagne',emoji: '🇪🇸' }, b: { label: 'Madrid',emoji: '🏟️' } },
  { a: { label: 'Algérie',emoji: '🇩🇿' }, b: { label: 'Alger', emoji: '🕌' } },
  { a: { label: 'Tunisie',emoji: '🇹🇳' }, b: { label: 'Tunis', emoji: '🕌' } },
  { a: { label: 'Mexique',emoji: '🇲🇽' }, b: { label: 'Mexico',emoji: '🌵' } },
  { a: { label: 'Canada', emoji: '🇨🇦' }, b: { label: 'Ottawa',emoji: '🍁' } },
  { a: { label: 'Inde',   emoji: '🇮🇳' }, b: { label: 'Delhi', emoji: '🛕' } },
];

/** Mulberry32 deterministic PRNG (good enough for daily seed). */
function mulberry32(seed: number) {
  return function() {
    let t = (seed += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function createInitialState(opts: VariantOptions): GameState {
  const { rows, cols, matchSize } = opts;
  const total = rows * cols;
  if (total % matchSize !== 0) {
    throw new Error(`Grid ${rows}x${cols} not divisible by matchSize ${matchSize}`);
  }
  const groupCount = total / matchSize;
  const seed = opts.seedDaily ? dailySeed() : Math.floor(Math.random() * 0xffffffff);
  const rand = mulberry32(seed);

  let cards: CardItem[] = [];
  if (opts.inverse && matchSize === 2) {
    // Inverse: groupCount pairs of A↔B
    const pool = shuffle(INVERSE_PAIRS, rand).slice(0, groupCount);
    pool.forEach((p, i) => {
      const groupKey = `inv-${i}`;
      cards.push({ id: `${groupKey}-a`, groupKey, label: p.a.label, emoji: p.a.emoji });
      cards.push({ id: `${groupKey}-b`, groupKey, label: p.b.label, emoji: p.b.emoji });
    });
  } else {
    const symbols = opts.symbols ?? DEFAULT_SYMBOLS;
    const picked = shuffle(symbols, rand).slice(0, groupCount);
    picked.forEach((sym, gi) => {
      const groupKey = `g-${gi}`;
      for (let r = 0; r < matchSize; r++) {
        cards.push({ id: `${groupKey}-${r}`, groupKey, label: sym, emoji: sym });
      }
    });
  }
  cards = shuffle(cards, rand);

  const grid: GridSlot[] = cards.map((c) => ({ card: c, faceUp: false, matched: false }));
  return {
    rows, cols, matchSize, grid,
    flippedIndices: [],
    matchCount: 0,
    totalMatches: groupCount,
    moves: 0,
    durationMs: 0,
    startedAt: Date.now(),
    preview: !!opts.preview,
    phase: opts.preview ? 'preview' : 'playing',
  };
}

function dailySeed(): number {
  const d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'RESET':
      return createInitialState({ rows: state.rows, cols: state.cols, matchSize: state.matchSize });

    case 'END_PREVIEW':
      if (state.phase !== 'preview') return state;
      return {
        ...state,
        preview: false,
        phase: 'playing',
        grid: state.grid.map((s) => ({ ...s, faceUp: false })),
        startedAt: Date.now(),
      };

    case 'TICK':
      if (state.phase !== 'playing') return state;
      return { ...state, durationMs: state.durationMs + action.ms };

    case 'FLIP': {
      if (state.phase !== 'playing') return state;
      const slot = state.grid[action.index];
      if (!slot || slot.matched || slot.faceUp) return state;
      if (state.flippedIndices.length >= state.matchSize) return state;

      const grid = state.grid.map((s, i) =>
        i === action.index ? { ...s, faceUp: true } : s,
      );
      const flippedIndices = [...state.flippedIndices, action.index];

      if (flippedIndices.length === state.matchSize) {
        // auto-evaluate
        const groupKeys = flippedIndices.map((i) => grid[i].card.groupKey);
        const allSame = groupKeys.every((g) => g === groupKeys[0]);
        if (allSame) {
          const newGrid = grid.map((s, i) =>
            flippedIndices.includes(i) ? { ...s, matched: true } : s,
          );
          const matchCount = state.matchCount + 1;
          const next: GameState = {
            ...state,
            grid: newGrid,
            flippedIndices: [],
            matchCount,
            moves: state.moves + 1,
          };
          if (matchCount >= state.totalMatches) return { ...next, phase: 'won' };
          return next;
        }
        return { ...state, grid, flippedIndices, moves: state.moves + 1 };
      }
      return { ...state, grid, flippedIndices };
    }

    case 'HIDE_UNMATCHED':
      if (state.flippedIndices.length === 0) return state;
      return {
        ...state,
        grid: state.grid.map((s, i) =>
          state.flippedIndices.includes(i) && !s.matched ? { ...s, faceUp: false } : s,
        ),
        flippedIndices: [],
      };

    case 'CHECK':
      return state;
  }
}

export function isWon(state: GameState): boolean {
  return state.matchCount >= state.totalMatches;
}

/** Score: matches * 100 - moves * 5 - seconds, floor 0. */
export function scoreFor(state: GameState): number {
  const seconds = Math.floor(state.durationMs / 1000);
  return Math.max(0, state.matchCount * 100 - state.moves * 5 - seconds);
}

/**
 * Détection de blocage Memory :
 *  - Memory n'a JAMAIS de blocage logique (tu peux toujours retourner 2 cartes
 *    tant que des paires restent à trouver).
 *  - MAIS en mode speedrun avec un timeLimitMs (en option),
 *    on déclenche "stuck" quand le temps est écoulé sans avoir tout trouvé.
 *  - En mode "limited moves", on déclenche aussi quand moves >= maxMoves.
 */
export interface StuckOptions {
  timeLimitMs?: number;     // ex: 180_000 (3 min) pour speedrun
  maxMoves?: number;         // ex: 40 (mode coopératif)
}

export function isStuck(state: GameState, opts: StuckOptions = {}): boolean {
  if (state.phase !== 'playing') return false;
  if (opts.timeLimitMs && state.durationMs >= opts.timeLimitMs) return true;
  if (opts.maxMoves && state.moves >= opts.maxMoves) return true;
  return false;
}
