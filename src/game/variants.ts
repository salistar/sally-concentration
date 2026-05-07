/**
 * @file variants.ts — Catalog of all Concentration / Memory variants.
 */

export type VariantKey =
  | 'classic-3x4' | 'classic-4x4' | 'classic-4x6' | 'classic-6x6'
  | 'classic-6x8' | 'classic-8x8'
  | 'triplets-4x6' | 'inverse-pairs' | 'highlander' | 'speedrun'
  | 'daily-challenge' | 'cooperative-2v2' | 'vol-multi';

export interface Variant {
  key: VariantKey;
  engine: 'memory' | 'triplets' | 'inverse' | 'unsupported';
  emoji: string;
  name: string;
  shortDesc: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  winRate: string;
  duration: string;
  cards: number;
  rules: { title: string; body: string }[];
  available: boolean;
  options?: {
    rows?: number; cols?: number; matchSize?: 2 | 3;
    preview?: number;             // ms cards visible at start
    timed?: boolean;
    seedDaily?: boolean;
    multi?: boolean;              // requires socket (multiplayer)
    coop?: boolean;
    steal?: boolean;
  };
}

export const VARIANTS: Variant[] = [
  // ─────────────── Classic by size ───────────────
  {
    key: 'classic-3x4', engine: 'memory', emoji: '🟦', name: 'Classique 3×4',
    shortDesc: '12 cartes, 6 paires — facile (enfants 4-5 ans).',
    difficulty: 1, winRate: '~95%', duration: '1-2 min', cards: 12,
    available: true, options: { rows: 3, cols: 4, matchSize: 2 },
    rules: [
      { title: 'Objectif', body: 'Retrouver toutes les paires de cartes identiques.' },
      { title: 'Mise en place', body: '12 cartes face cachée disposées en grille 3×4 (3 lignes, 4 colonnes). 6 paires à découvrir.' },
      { title: 'Tour de jeu', body: 'Retourne 2 cartes face visible. Si elles sont identiques → tu gagnes la paire et rejoues. Sinon → elles sont retournées face cachée.' },
      { title: 'Stratégie', body: 'Mémorise la position des cartes vues. Commence par les bords (plus faciles à se rappeler).' },
      { title: 'Victoire', body: 'Toutes les paires trouvées. Score = 100 − (coups × 5) − secondes.' },
    ],
  },
  {
    key: 'classic-4x4', engine: 'memory', emoji: '🟥', name: 'Classique 4×4',
    shortDesc: '16 cartes, 8 paires — easy.',
    difficulty: 1, winRate: '~90%', duration: '2-3 min', cards: 16,
    available: true, options: { rows: 4, cols: 4, matchSize: 2 },
    rules: [
      { title: 'Objectif', body: 'Retrouver les 8 paires.' },
      { title: 'Mise en place', body: 'Grille 4×4 = 16 cartes. Chaque paire = 2 cartes identiques.' },
      { title: 'Règle', body: 'Tap sur 2 cartes par tour. Match → garde + rejoue. No match → retournées.' },
      { title: 'Victoire', body: 'Toutes les paires trouvées. Score combiné coups + temps.' },
    ],
  },
  {
    key: 'classic-4x6', engine: 'memory', emoji: '🟨', name: 'Classique 4×6',
    shortDesc: '24 cartes, 12 paires — medium.',
    difficulty: 2, winRate: '~80%', duration: '3-5 min', cards: 24,
    available: true, options: { rows: 4, cols: 6, matchSize: 2 },
    rules: [
      { title: 'Objectif', body: 'Trouver les 12 paires.' },
      { title: 'Mise en place', body: 'Grille 4×6 = 24 cartes face cachée.' },
      { title: 'Niveau', body: 'Equilibré pour adultes casual ou enfants 7-9 ans.' },
      { title: 'Stratégie', body: 'Mémorise par "grappes" de 3-4 cartes à la fois, pas plus.' },
    ],
  },
  {
    key: 'classic-6x6', engine: 'memory', emoji: '🟩', name: 'Classique 6×6',
    shortDesc: '36 cartes, 18 paires — standard adulte.',
    difficulty: 3, winRate: '~65%', duration: '5-8 min', cards: 36,
    available: true, options: { rows: 6, cols: 6, matchSize: 2 },
    rules: [
      { title: 'Objectif', body: '18 paires à trouver.' },
      { title: 'Mise en place', body: 'Grille 6×6 = 36 cartes.' },
      { title: 'Difficulté', body: 'Standard pour adultes. Mémoire moyenne suffit avec stratégie.' },
      { title: 'Stratégie', body: 'Méthode des loci : associe chaque position à un lieu mental connu.' },
    ],
  },
  {
    key: 'classic-6x8', engine: 'memory', emoji: '🟪', name: 'Classique 6×8',
    shortDesc: '48 cartes, 24 paires — hard.',
    difficulty: 4, winRate: '~45%', duration: '8-12 min', cards: 48,
    available: true, options: { rows: 6, cols: 8, matchSize: 2 },
    rules: [
      { title: 'Objectif', body: '24 paires à trouver.' },
      { title: 'Mise en place', body: 'Grille 6×8 = 48 cartes.' },
      { title: 'Difficulté', body: 'Hard — exige mémoire entraînée et stratégie.' },
    ],
  },
  {
    key: 'classic-8x8', engine: 'memory', emoji: '⬛', name: 'Classique 8×8',
    shortDesc: '64 cartes, 32 paires — expert.',
    difficulty: 5, winRate: '~25%', duration: '10-15 min', cards: 64,
    available: true, options: { rows: 8, cols: 8, matchSize: 2 },
    rules: [
      { title: 'Objectif', body: '32 paires à trouver.' },
      { title: 'Niveau', body: 'Expert — pour mémoire vraiment entraînée.' },
      { title: 'Conseil', body: 'Découpe mentalement la grille en quadrants 4×4.' },
    ],
  },

  // ─────────────── Variantes ───────────────
  {
    key: 'triplets-4x6', engine: 'triplets', emoji: '🎯', name: 'Triplets 4×6',
    shortDesc: 'Retrouver des triplets (3 cartes identiques) au lieu de paires.',
    difficulty: 4, winRate: '~30%', duration: '5-8 min', cards: 24,
    available: true, options: { rows: 4, cols: 6, matchSize: 3 },
    rules: [
      { title: 'Objectif', body: 'Au lieu de paires (×2), retrouver des triplets (×3 cartes identiques).' },
      { title: 'Tour', body: 'Retourne 3 cartes par tour. Triplet identique → garde et rejoue.' },
      { title: 'Difficulté', body: 'Beaucoup plus dur car 3 informations à retenir simultanément.' },
      { title: 'Mise en place', body: '24 cartes = 8 triplets.' },
    ],
  },
  {
    key: 'inverse-pairs', engine: 'inverse', emoji: '🔄', name: 'Paires Inversées',
    shortDesc: 'Match complémentaire (pays+drapeau, mot+traduction).',
    difficulty: 3, winRate: '~70%', duration: '4-6 min', cards: 24,
    available: true, options: { rows: 4, cols: 6, matchSize: 2 },
    rules: [
      { title: 'Objectif', body: 'Retrouver des paires COMPLÉMENTAIRES (pas identiques).' },
      { title: 'Exemples', body: 'Pays + drapeau · Mot français + traduction arabe · Sourate + numéro.' },
      { title: 'Mode pédagogique', body: 'Excellent pour apprendre langues, géographie, culture.' },
      { title: 'Règle', body: 'Comme Memory classique, mais le match utilise une fonction d\'équivalence (table de mapping).' },
    ],
  },
  {
    key: 'highlander', engine: 'memory', emoji: '👁️', name: 'Highlander',
    shortDesc: 'Toutes cartes visibles 3 sec au début, puis se retournent.',
    difficulty: 4, winRate: '~40%', duration: '3-5 min', cards: 24,
    available: true, options: { rows: 4, cols: 6, matchSize: 2, preview: 3000 },
    rules: [
      { title: 'Phase mémoire', body: 'Au début, toutes les cartes sont retournées face visible pendant 3 secondes.' },
      { title: 'Phase jeu', body: 'Après les 3 secondes, toutes face cachée. Tu dois te rappeler.' },
      { title: 'Conseil', body: 'Essaie de mémoriser les paires les plus proches d\'abord.' },
      { title: 'Score', body: 'Bonus si tu trouves toutes les paires sans erreur.' },
    ],
  },
  {
    key: 'speedrun', engine: 'memory', emoji: '⚡', name: 'Speedrun',
    shortDesc: 'Chronométré — score = paires × 100 − secondes.',
    difficulty: 3, winRate: '~50%', duration: '~3 min', cards: 24,
    available: true, options: { rows: 4, cols: 6, matchSize: 2, timed: true },
    rules: [
      { title: 'Objectif', body: 'Vider la grille le plus vite possible.' },
      { title: 'Score', body: 'Paires trouvées × 100 − secondes écoulées. Plus rapide = meilleur score.' },
      { title: 'Pénalité', body: '−10 par paire ratée.' },
      { title: 'Classement', body: 'Inscrit au leaderboard quotidien.' },
    ],
  },
  {
    key: 'daily-challenge', engine: 'memory', emoji: '📅', name: 'Défi du Jour',
    shortDesc: 'Même grille pour tous les joueurs du jour, classement quotidien.',
    difficulty: 3, winRate: '~60%', duration: '5-8 min', cards: 36,
    available: true, options: { rows: 6, cols: 6, matchSize: 2, seedDaily: true },
    rules: [
      { title: 'Principe', body: 'Tous les joueurs du monde reçoivent EXACTEMENT la même disposition de cartes.' },
      { title: 'Compétition', body: 'Ton score est comparé au leaderboard mondial du jour.' },
      { title: 'Reset', body: 'Nouveau défi chaque jour à minuit (UTC).' },
      { title: 'Récompense', body: 'Bonus de pièces si tu finis dans le top 100.' },
    ],
  },
  {
    key: 'cooperative-2v2', engine: 'memory', emoji: '🤝', name: 'Coopératif 2-4',
    shortDesc: 'Tous ensemble contre le chrono (multi-joueurs).',
    difficulty: 3, winRate: '~70%', duration: '5-10 min', cards: 36,
    available: true, options: { rows: 6, cols: 6, matchSize: 2, multi: true, coop: true },
    rules: [
      { title: 'Mode', body: '2 à 4 joueurs collaborent contre un chrono ou un nombre de coups limité.' },
      { title: 'Tour', body: 'Chacun à son tour retourne 2 cartes. Toutes les paires trouvées comptent pour l\'équipe.' },
      { title: 'Communication', body: 'Autorisée pendant le tour adverse (signaler les positions vues).' },
      { title: 'Victoire', body: 'Vider le plateau en moins de N coups (40 par défaut sur 6×6).' },
    ],
  },
  {
    key: 'vol-multi', engine: 'memory', emoji: '⚔️', name: 'Vol — Multi compétitif',
    shortDesc: 'Mode "steal" : si tu trouves la valeur d\'une paire adverse, tu la voles.',
    difficulty: 4, winRate: '~50%', duration: '8-12 min', cards: 48,
    available: true, options: { rows: 6, cols: 8, matchSize: 2, multi: true, steal: true },
    rules: [
      { title: 'Mode', body: '2-4 joueurs en compétition. Les paires gagnées restent visibles devant chaque joueur.' },
      { title: 'Vol', body: 'Si tu trouves une paire dont la valeur correspond à une paire déjà gagnée par un adversaire, TU LA VOLES (elle vient devant toi).' },
      { title: 'Stratégie', body: 'Très tactique : bluffer en stockant des paires, attaquer pour voler.' },
      { title: 'Victoire', body: 'Le joueur avec le plus de paires à la fin gagne.' },
    ],
  },
];

export const AVAILABLE_VARIANTS = VARIANTS.filter((v) => v.available);
export function findVariant(key: string): Variant | undefined {
  return VARIANTS.find((v) => v.key === key);
}
