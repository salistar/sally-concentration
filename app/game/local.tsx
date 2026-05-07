/**
 * @file game/local.tsx
 * @description Memory/Concentration local game screen.
 * Grid of face-down cards, tap to flip, match animation.
 * Dark gradient bg with concentration pink (#DB2777).
 */

import React, { useReducer, useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import {
  GameState,
  gameReducer,
  createInitialState,
  getCurrentPlayer,
  isPlayerTurn,
  botChooseCard,
  botRecordCard,
  GRID_ROWS,
  GRID_COLS,
  getScoreboard,
} from '../../src/game/memoryEngine';
import { getCardImage, getCardBackImage } from '../../src/game/cardAssets';
import { useTranslation } from 'react-i18next';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = 6;
const GRID_PADDING = 12;
const CARD_WIDTH = (SCREEN_WIDTH - GRID_PADDING * 2 - CARD_GAP * (GRID_COLS - 1)) / GRID_COLS;
const CARD_HEIGHT = CARD_WIDTH * 1.45;

const FLIP_DELAY = 800;
const BOT_THINK_DELAY = 600;
const MATCH_DELAY = 400;

export default function MemoryLocalGame() {
  const router = useRouter();
  const { t } = useTranslation('game');
  const [state, dispatch] = useReducer(gameReducer, createInitialState(1, 1));
  const [isProcessing, setIsProcessing] = useState(false);
  const flipAnimations = useRef<Animated.Value[]>(
    Array.from({ length: GRID_ROWS * GRID_COLS }, () => new Animated.Value(0))
  ).current;
  const matchScaleAnimations = useRef<Animated.Value[]>(
    Array.from({ length: GRID_ROWS * GRID_COLS }, () => new Animated.Value(1))
  ).current;
  const botTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, []);

  // Animate card flip
  const animateFlip = useCallback(
    (index: number, toFaceUp: boolean, callback?: () => void) => {
      Animated.timing(flipAnimations[index], {
        toValue: toFaceUp ? 1 : 0,
        duration: 250,
        useNativeDriver: true,
      }).start(callback);
    },
    [flipAnimations]
  );

  // Animate match
  const animateMatch = useCallback(
    (indices: number[]) => {
      const anims = indices.map((idx) =>
        Animated.sequence([
          Animated.timing(matchScaleAnimations[idx], {
            toValue: 1.15,
            duration: 150,
            useNativeDriver: true,
          }),
          Animated.timing(matchScaleAnimations[idx], {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          }),
        ])
      );
      Animated.parallel(anims).start();
    },
    [matchScaleAnimations]
  );

  // Handle card flip (human player)
  const handleFlipCard = useCallback(
    (index: number) => {
      if (isProcessing) return;
      if (state.phase !== 'playing') return;

      const currentPlayer = getCurrentPlayer(state);
      if (currentPlayer.isBot) return;

      const gridCard = state.grid[index];
      if (gridCard.faceUp || gridCard.matched) return;
      if (state.flippedIndices.length >= 2) return;

      // Animate flip
      animateFlip(index, true);
      dispatch({ type: 'FLIP_CARD', index });
    },
    [state, isProcessing, animateFlip]
  );

  // Check match after 2 cards flipped
  useEffect(() => {
    if (state.flippedIndices.length !== 2) return;

    setIsProcessing(true);

    const timer = setTimeout(() => {
      const [i1, i2] = state.flippedIndices;
      const isMatch = state.grid[i1].card.value === state.grid[i2].card.value;

      dispatch({ type: 'CHECK_MATCH' });

      if (isMatch) {
        animateMatch([i1, i2]);
        setTimeout(() => setIsProcessing(false), MATCH_DELAY);
      } else {
        // Flip cards back
        animateFlip(i1, false);
        animateFlip(i2, false);
        setTimeout(() => {
          dispatch({ type: 'HIDE_UNMATCHED' });
          setIsProcessing(false);
        }, 300);
      }
    }, FLIP_DELAY);

    return () => clearTimeout(timer);
  }, [state.flippedIndices, state.grid, animateFlip, animateMatch]);

  // Bot turn
  useEffect(() => {
    if (state.phase !== 'playing') return;
    if (isProcessing) return;

    const currentPlayer = getCurrentPlayer(state);
    if (!currentPlayer.isBot) return;
    if (state.flippedIndices.length >= 2) return;

    botTimerRef.current = setTimeout(() => {
      const index = botChooseCard(
        currentPlayer.id,
        state.grid,
        state.flippedIndices
      );
      if (index >= 0) {
        animateFlip(index, true);
        dispatch({ type: 'FLIP_CARD', index });
      }
    }, BOT_THINK_DELAY);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
    };
  }, [state, isProcessing, animateFlip]);

  // Restart game
  const handleRestart = useCallback(() => {
    // Reset animations
    flipAnimations.forEach((a) => a.setValue(0));
    matchScaleAnimations.forEach((a) => a.setValue(1));
    dispatch({ type: 'RESET' });
    setIsProcessing(false);
  }, [flipAnimations, matchScaleAnimations]);

  const currentPlayer = getCurrentPlayer(state);

  return (
    <LinearGradient colors={['#1a0a12', '#DB2777', '#831347']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{t('concentration.title')}</Text>
          <TouchableOpacity onPress={handleRestart} style={styles.restartButton}>
            <Ionicons name="refresh" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Scores — humains EN PREMIER, puis bots (ordre demandé : user-first, bot-after) */}
        <View style={styles.scoresRow}>
          {[...state.players]
            .map((p, originalIdx) => ({ player: p, originalIdx }))
            .sort((a, b) => Number(!!a.player.isBot) - Number(!!b.player.isBot))
            .map(({ player, originalIdx }) => (
              <View
                key={player.id}
                style={[
                  styles.scoreCard,
                  state.currentPlayerIndex === originalIdx && styles.scoreCardActive,
                ]}
              >
                <Text style={styles.scoreName}>
                  {player.isBot ? t('concentration.bot') : t('concentration.you')} · {player.name}
                </Text>
                <Text style={styles.scoreValue}>
                  {t('concentration.pairsFound', { count: player.pairsCount })}
                </Text>
              </View>
            ))}
        </View>

        {/* Current turn indicator */}
        <Text style={styles.turnText}>
          {state.phase === 'gameOver'
            ? state.winnerId
              ? state.players.find((p) => p.id === state.winnerId)?.isBot
                ? t('concentration.defeat')
                : t('concentration.victory')
              : t('concentration.gameOver')
            : currentPlayer.isBot
              ? t('concentration.opponentTurn')
              : t('concentration.yourTurn')}
        </Text>

        {/* Grid */}
        <View style={styles.gridContainer}>
          {Array.from({ length: GRID_ROWS }).map((_, row) => (
            <View key={row} style={styles.gridRow}>
              {Array.from({ length: GRID_COLS }).map((_, col) => {
                const index = row * GRID_COLS + col;
                const gridCard = state.grid[index];
                const flipAnim = flipAnimations[index];
                const scaleAnim = matchScaleAnimations[index];

                const frontInterpolate = flipAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['180deg', '90deg', '0deg'],
                });
                const backInterpolate = flipAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: ['0deg', '90deg', '180deg'],
                });

                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => handleFlipCard(index)}
                    activeOpacity={0.8}
                    disabled={
                      gridCard.matched ||
                      gridCard.faceUp ||
                      isProcessing ||
                      currentPlayer.isBot
                    }
                  >
                    <Animated.View
                      style={[
                        styles.cardWrapper,
                        { transform: [{ scale: scaleAnim }] },
                        gridCard.matched && styles.cardMatched,
                      ]}
                    >
                      {/* Back of card */}
                      <Animated.View
                        style={[
                          styles.card,
                          {
                            transform: [{ rotateY: backInterpolate }],
                            backfaceVisibility: 'hidden',
                          },
                        ]}
                      >
                        <Image
                          source={getCardBackImage()}
                          style={styles.cardImage}
                          resizeMode="contain"
                        />
                      </Animated.View>

                      {/* Front of card */}
                      <Animated.View
                        style={[
                          styles.card,
                          styles.cardFront,
                          {
                            transform: [{ rotateY: frontInterpolate }],
                            backfaceVisibility: 'hidden',
                          },
                        ]}
                      >
                        <Image
                          source={getCardImage(gridCard.card.id)}
                          style={styles.cardImage}
                          resizeMode="contain"
                        />
                      </Animated.View>
                    </Animated.View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Game Over overlay */}
        {state.phase === 'gameOver' && (
          <View style={styles.gameOverOverlay}>
            <View style={styles.gameOverCard}>
              <Text style={styles.gameOverTitle}>{t('concentration.gameOver')}</Text>
              {getScoreboard(state).map((player, idx) => (
                <Text key={player.id} style={styles.gameOverScore}>
                  {idx + 1}. {player.name}: {player.pairsCount} paires
                </Text>
              ))}
              <TouchableOpacity onPress={handleRestart} style={styles.playAgainButton}>
                <Text style={styles.playAgainText}>{t('concentration.playAgain')}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.back()} style={styles.quitButton}>
                <Text style={styles.quitText}>{t('concentration.quit')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  restartButton: {
    padding: 8,
  },
  scoresRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  scoreCard: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 100,
  },
  scoreCardActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderWidth: 2,
    borderColor: '#fff',
  },
  scoreName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  scoreValue: {
    color: '#fce4ec',
    fontSize: 13,
    marginTop: 2,
  },
  turnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  gridContainer: {
    alignItems: 'center',
    paddingHorizontal: GRID_PADDING,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginBottom: CARD_GAP,
  },
  cardWrapper: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
  },
  cardMatched: {
    opacity: 0.5,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
  },
  cardFront: {
    // Stacked behind card back
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  gameOverCard: {
    backgroundColor: '#1f1f2e',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    width: '80%',
  },
  gameOverTitle: {
    color: '#DB2777',
    fontSize: 24,
    fontWeight: '800',
    marginBottom: 16,
  },
  gameOverScore: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 6,
  },
  playAgainButton: {
    backgroundColor: '#DB2777',
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 12,
    marginTop: 20,
  },
  playAgainText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  quitButton: {
    marginTop: 12,
    paddingVertical: 8,
  },
  quitText: {
    color: '#aaa',
    fontSize: 14,
  },
});
