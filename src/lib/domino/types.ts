/**
 * Dominó Clásico — Tipos del dominó (doble seis, 28 fichas)
 */

export interface Tile {
  /** Identificador único: "x-y" con x <= y */
  id: string
  x: number
  y: number
}

/** Ficha colocada en la mesa, ya orientada: board[i].right === board[i+1].left */
export interface BoardTile {
  id: string
  left: number
  right: number
  /** true si es doble (x === y), se dibuja perpendicular */
  isDouble: boolean
}

export type Difficulty = 'facil' | 'normal' | 'dificil'

export interface Settings {
  /** 2, 3 o 4 jugadores (el primero es humano, el resto CPU) */
  numPlayers: 2 | 3 | 4
  difficulty: Difficulty
  /** Puntuación objetivo para ganar la partida */
  targetScore: 100 | 150 | 200
  sound: boolean
}

export interface Player {
  id: number
  name: string
  isAI: boolean
  hand: Tile[]
  score: number
}

export type End = 'left' | 'right'

/** Resultado de "¿dónde puedo jugar esta ficha?" */
export type PlayOption = 'left' | 'right' | 'both' | null

export interface LogEntry {
  id: number
  round: number
  player: string
  text: string
  kind: 'play' | 'draw' | 'pass' | 'round' | 'system'
}

export interface RoundResult {
  type: 'domino' | 'block' | 'tie'
  winnerId: number | null
  winnerName: string
  /** Puntos sumados al ganador (0 en empate) */
  points: number
  /** Fichas restantes de cada jugador al cierre de ronda */
  remaining: { playerId: number; name: string; pips: number; tiles: Tile[] }[]
}

export type Phase = 'menu' | 'dealing' | 'playing' | 'roundEnd' | 'gameEnd'

export interface GameState {
  phase: Phase
  settings: Settings
  players: Player[]
  board: BoardTile[]
  boneyard: Tile[]
  current: number
  /** Pases consecutivos sin jugada (para detectar bloqueo) */
  passes: number
  round: number
  log: LogEntry[]
  roundResult: RoundResult | null
  /** Ficha seleccionada por el humano esperando elección de extremo */
  selectedTileId: string | null
  /** Última ficha colocada (para animación y scroll) */
  lastPlacedId: string | null
  /** Ficha forzada de apertura de ronda (doble más alto o ficha más alta) */
  forcedTileId: string | null
  /** Contador de acciones: protege los efectos async (StrictMode / duplicados) */
  seq: number
  /** Fichas robadas este turno (para UI/log) */
  drawnThisTurn: number
  /** Victoria final de la partida */
  gameWinnerId: number | null
  /** Modelado de rivales: valores que cada jugador no pudo igualar (por pases/robos) */
  lacks: number[][]
}

export const AI_NAMES = ['Juan Pablo Duarte', 'Carlos', 'Marta'] as const

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  facil: 'Fácil',
  normal: 'Normal',
  dificil: 'Difícil',
}

export const tileLabel = (t: Tile | BoardTile): string => {
  const a = 'x' in t ? t.x : t.left
  const b = 'y' in t ? t.y : t.right
  return `${Math.min(a, b)}|${Math.max(a, b)}`
}

export const pipSum = (t: Tile): number => t.x + t.y

export const isDouble = (t: Tile): boolean => t.x === t.y
