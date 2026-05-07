/**
 * MemoryEngine - Memory/Concentration card game engine
 * Pair-matching game using the Spanish 40-card deck for 1-4 players.
 *
 * Rules:
 * - 20 cards (10 pairs of matching values) placed face-down in a 4x5 grid
 * - Players take turns flipping 2 cards
 * - If values match: player keeps the pair and gets another turn
 * - If no match: cards flip back, next player's turn
 * - Game ends when all pairs are found
 * - Player with the most pairs wins
 */

// ============================================================
// TYPES
// ============================================================

export type Suit = 'bastos' | 'copas' | 'espadas' | 'oros';
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 10 | 11 | 12;

export interface Card {
  suit: Suit;
  value: CardValue;
  id: string; // e.g. "07-copas"
}

export interface GridCard {
  card: Card;
  faceUp: boolean;
  matched: boolean;
}

export interface Player {
  id: string;
  name: string;
  pairsCount: number;
  isBot: boolean;
}

export type GamePhase = 'playing' | 'gameOver';

export interface GameState {
  phase: GamePhase;
  players: Player[];
  grid: GridCard[];
  flippedIndices: number[];
  currentPlayerIndex: number;
  matchCount: number;
  totalPairs: number;
  winnerId: string | null;
  lastMatchPlayerId: string | null;
}

export type GameAction =
  | { type: 'FLIP_CARD'; index: number }
  | { type: 'CHECK_MATCH' }
  | { type: 'HIDE_UNMATCHED' }
  | { type: 'RESET'; playerCount?: number; botCount?: number };

// ============================================================
// CONSTANTS
// ============================================================

export const SUITS: Suit[] = ['bastos', 'copas', 'espadas', 'oros'];
export const VALUES: CardValue[] = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12];
export const GRID_ROWS = 4;
export const GRID_COLS = 5;
export const TOTAL_CARDS = GRID_ROWS * GRID_COLS;
export const TOTAL_PAIRS = TOTAL_CARDS / 2;
export const MIN_PLAYERS = 1;
export const MAX_PLAYERS = 4;

export const SUIT_NAMES: Record<Suit, string> = {
  bastos: 'Bâtons',
  copas: 'Coupes',
  espadas: 'Épées',
  oros: 'Deniers',
};

export const VALUE_NAMES: Record<CardValue, string> = {
  1: 'As',
  2: 'Deux',
  3: 'Trois',
  4: 'Quatre',
  5: 'Cinq',
  6: 'Six',
  7: 'Sept',
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey',
};

// ============================================================
// DECK & GRID
// ============================================================

/** Create the full 40-card Spanish deck */
export function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const value of VALUES) {
      const valueStr = value.toString().padStart(2, '0');
      deck.push({ suit, value, id: `${valueStr}-${suit}` });
    }
  }
  return deck;
}

/** Fisher-Yates shuffle */
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Select 10 pairs (matching values, possibly different suits) from the deck.
 * Picks 10 distinct values, then for each value picks 2 random cards of that value.
 */
export function selectPairs(deck: Card[]): Card[] {
  const byValue = new Map<CardValue, Card[]>();
  for (const card of deck) {
    const list = byValue.get(card.value) || [];
    list.push(card);
    byValue.set(card.value, list);
  }

  const selectedValues = shuffle([...byValue.keys()]).slice(0, TOTAL_PAIRS);
  const selected: Card[] = [];

  for (const value of selectedValues) {
    const cards = shuffle(byValue.get(value)!);
    selected.push(cards[0], cards[1]);
  }

  return selected;
}

/** Create a shuffled grid of 20 cards */
export function createGrid(): GridCard[] {
  const deck = createDeck();
  const pairs = selectPairs(deck);
  const shuffled = shuffle(pairs);

  return shuffled.map((card) => ({
    card,
    faceUp: false,
    matched: false,
  }));
}

// ============================================================
// GAME LOGIC
// ============================================================

/** Check if two flipped cards match (same value) */
export function cardsMatch(grid: GridCard[], i1: number, i2: number): boolean {
  return grid[i1].card.value === grid[i2].card.value;
}

/** Get next player index */
export function getNextPlayerIndex(current: number, playerCount: number): number {
  return (current + 1) % playerCount;
}

/** Check if all pairs have been found */
export function allPairsFound(grid: GridCard[]): boolean {
  return grid.every((gc) => gc.matched);
}

/** Determine winner (player with most pairs; first in case of tie) */
export function determineWinner(players: Player[]): Player {
  return [...players].sort((a, b) => b.pairsCount - a.pairsCount)[0];
}

/** Format card for display */
export function formatCard(card: Card): string {
  return `${VALUE_NAMES[card.value]} de ${SUIT_NAMES[card.suit]}`;
}

// ============================================================
// BOT AI
// ============================================================

interface BotMemory {
  /** Maps grid index -> card value that was seen there */
  seenCards: Map<number, CardValue>;
}

const botMemories = new Map<string, BotMemory>();

/** Initialize or get bot memory */
export function getBotMemory(botId: string): BotMemory {
  if (!botMemories.has(botId)) {
    botMemories.set(botId, { seenCards: new Map() });
  }
  return botMemories.get(botId)!;
}

/** Record a card that was revealed */
export function botRecordCard(botId: string, index: number, value: CardValue): void {
  const mem = getBotMemory(botId);
  mem.seenCards.set(index, value);
}

/** Bot picks which card to flip. Returns the grid index. */
export function botChooseCard(
  botId: string,
  grid: GridCard[],
  flippedIndices: number[]
): number {
  const mem = getBotMemory(botId);

  // Available indices (not matched, not already flipped this turn)
  const available = grid
    .map((gc, i) => i)
    .filter((i) => !grid[i].matched && !grid[i].faceUp && !flippedIndices.includes(i));

  if (available.length === 0) return -1;

  // If we already flipped one card, try to find its match in memory
  if (flippedIndices.length === 1) {
    const firstValue = grid[flippedIndices[0]].card.value;
    for (const idx of available) {
      if (mem.seenCards.get(idx) === firstValue) {
        return idx;
      }
    }
    // No known match, pick random
    return available[Math.floor(Math.random() * available.length)];
  }

  // First flip: check if we know any pair
  for (const [idx1, val1] of mem.seenCards) {
    if (grid[idx1].matched || !available.includes(idx1)) continue;
    for (const [idx2, val2] of mem.seenCards) {
      if (idx2 === idx1) continue;
      if (grid[idx2].matched || !available.includes(idx2)) continue;
      if (val1 === val2) {
        return idx1; // Flip the first of the known pair
      }
    }
  }

  // No known pair, flip random
  return available[Math.floor(Math.random() * available.length)];
}

/** Reset all bot memories (e.g. on new game) */
export function resetBotMemories(): void {
  botMemories.clear();
}

// ============================================================
// PLAYERS
// ============================================================

/** Create players for the game */
export function createPlayers(
  humanCount: number,
  botCount: number
): Player[] {
  const players: Player[] = [];
  const botNames = ['Hamza', 'Fatima', 'Youssef', 'Amina'];

  for (let i = 0; i < humanCount; i++) {
    players.push({
      id: `player-${i + 1}`,
      name: i === 0 ? 'Vous' : `Joueur ${i + 1}`,
      pairsCount: 0,
      isBot: false,
    });
  }

  for (let i = 0; i < botCount; i++) {
    players.push({
      id: `bot-${i + 1}`,
      name: botNames[i] || `Bot ${i + 1}`,
      pairsCount: 0,
      isBot: true,
    });
  }

  return players;
}

// ============================================================
// INITIAL STATE
// ============================================================

export function createInitialState(
  humanCount: number = 1,
  botCount: number = 1
): GameState {
  resetBotMemories();
  return {
    phase: 'playing',
    players: createPlayers(humanCount, botCount),
    grid: createGrid(),
    flippedIndices: [],
    currentPlayerIndex: 0,
    matchCount: 0,
    totalPairs: TOTAL_PAIRS,
    winnerId: null,
    lastMatchPlayerId: null,
  };
}

// ============================================================
// REDUCER
// ============================================================

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'FLIP_CARD': {
      if (state.phase !== 'playing') return state;
      if (state.flippedIndices.length >= 2) return state;

      const { index } = action;
      if (index < 0 || index >= state.grid.length) return state;
      if (state.grid[index].faceUp || state.grid[index].matched) return state;
      if (state.flippedIndices.includes(index)) return state;

      const newGrid = [...state.grid];
      newGrid[index] = { ...newGrid[index], faceUp: true };

      const newFlipped = [...state.flippedIndices, index];

      // Record card for all bots
      const cardValue = newGrid[index].card.value;
      state.players.forEach((p) => {
        if (p.isBot) botRecordCard(p.id, index, cardValue);
      });

      return {
        ...state,
        grid: newGrid,
        flippedIndices: newFlipped,
      };
    }

    case 'CHECK_MATCH': {
      if (state.flippedIndices.length !== 2) return state;

      const [i1, i2] = state.flippedIndices;
      const isMatch = cardsMatch(state.grid, i1, i2);

      if (isMatch) {
        const newGrid = [...state.grid];
        newGrid[i1] = { ...newGrid[i1], matched: true };
        newGrid[i2] = { ...newGrid[i2], matched: true };

        const newPlayers = [...state.players];
        const currentPlayer = { ...newPlayers[state.currentPlayerIndex] };
        currentPlayer.pairsCount += 1;
        newPlayers[state.currentPlayerIndex] = currentPlayer;

        const newMatchCount = state.matchCount + 1;
        const isGameOver = newMatchCount >= state.totalPairs;

        if (isGameOver) {
          const winner = determineWinner(newPlayers);
          return {
            ...state,
            phase: 'gameOver',
            grid: newGrid,
            players: newPlayers,
            flippedIndices: [],
            matchCount: newMatchCount,
            winnerId: winner.id,
            lastMatchPlayerId: currentPlayer.id,
          };
        }

        // Same player goes again
        return {
          ...state,
          grid: newGrid,
          players: newPlayers,
          flippedIndices: [],
          matchCount: newMatchCount,
          lastMatchPlayerId: currentPlayer.id,
        };
      }

      // No match - will hide after delay (HIDE_UNMATCHED)
      return {
        ...state,
        lastMatchPlayerId: null,
      };
    }

    case 'HIDE_UNMATCHED': {
      if (state.flippedIndices.length !== 2) return state;

      const newGrid = [...state.grid];
      for (const idx of state.flippedIndices) {
        newGrid[idx] = { ...newGrid[idx], faceUp: false };
      }

      const nextPlayerIndex = getNextPlayerIndex(
        state.currentPlayerIndex,
        state.players.length
      );

      return {
        ...state,
        grid: newGrid,
        flippedIndices: [],
        currentPlayerIndex: nextPlayerIndex,
      };
    }

    case 'RESET': {
      const humanCount = action.playerCount ?? 1;
      const bots = action.botCount ?? 1;
      return createInitialState(humanCount, bots);
    }

    default:
      return state;
  }
}

// ============================================================
// HELPERS
// ============================================================

/** Get the current player */
export function getCurrentPlayer(state: GameState): Player {
  return state.players[state.currentPlayerIndex];
}

/** Check if it's a specific player's turn */
export function isPlayerTurn(state: GameState, playerId: string): boolean {
  return getCurrentPlayer(state).id === playerId;
}

/** Get scores sorted descending */
export function getScoreboard(state: GameState): Player[] {
  return [...state.players].sort((a, b) => b.pairsCount - a.pairsCount);
}

/** Get card image path */
export function getCardImagePath(card: Card): string {
  return `${card.id}.png`;
}

export function getCardBackImagePath(): string {
  return 'back.png';
}
