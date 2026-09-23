/**
 * Dominó Clásico — Motor de juego (funciones puras)
 * Reglas clásicas de "robar" (draw dominoes) con set de doble seis.
 */
import {
  AI_NAMES,
  type BoardTile,
  type End,
  type PlayOption,
  type Player,
  type RoundResult,
  type Settings,
  type Tile,
} from './types'

/** Crea el set completo de 28 fichas del doble seis. */
export function newSet(): Tile[] {
  const tiles: Tile[] = []
  for (let a = 0; a <= 6; a++) {
    for (let b = a; b <= 6; b++) {
      tiles.push({ id: `${a}-${b}`, x: a, y: b })
    }
  }
  return tiles
}

/** Barajado Fisher-Yates (devuelve copia). */
export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Fichas iniciales por jugador según número de jugadores. */
export function handSize(numPlayers: number): number {
  return numPlayers <= 3 ? 7 : 6
}

export interface Deal {
  hands: Tile[][]
  boneyard: Tile[]
}

/** Baraja y reparte. Siempre queda montón (2p:14, 3p:7, 4p:4). */
export function deal(numPlayers: number): Deal {
  const deck = shuffle(newSet())
  const size = handSize(numPlayers)
  const hands: Tile[][] = []
  for (let i = 0; i < numPlayers; i++) hands.push(deck.slice(i * size, (i + 1) * size))
  const boneyard = deck.slice(numPlayers * size)
  return { hands, boneyard }
}

export function createPlayers(settings: Settings, hands: Tile[][]): Player[] {
  return hands.map((hand, i) => ({
    id: i,
    name: i === 0 ? 'Tú' : (AI_NAMES[i - 1] ?? `CPU ${i}`),
    isAI: i !== 0,
    hand,
    score: 0,
  }))
}

/**
 * ¿Quién abre la ronda? El jugador con el doble más alto (6-6 → 0-0).
 * Si nadie tiene dobles, el que tenga la ficha con más puntos totales.
 */
export function openingPlayerAndTile(hands: readonly Tile[][]): { player: number; tile: Tile } {
  // Doble más alto
  for (let v = 6; v >= 0; v--) {
    const id = `${v}-${v}`
    for (let p = 0; p < hands.length; p++) {
      const tile = hands[p].find((t) => t.id === id)
      if (tile) return { player: p, tile }
    }
  }
  // Sin dobles: ficha con más puntos (siempre existe porque las manos no están vacías)
  let best: { player: number; tile: Tile } | null = null
  for (let p = 0; p < hands.length; p++) {
    for (const t of hands[p]) {
      if (!best || t.x + t.y > best.tile.x + best.tile.y) best = { player: p, tile: t }
    }
  }
  return best!
}

/** Valores abiertos en los extremos de la cadena. */
export function ends(board: readonly BoardTile[]): { left: number; right: number } | null {
  if (board.length === 0) return null
  return { left: board[0].left, right: board[board.length - 1].right }
}

/** ¿Se puede jugar esta ficha y en qué extremo(s)? */
export function playOption(tile: Tile, board: readonly BoardTile[]): PlayOption {
  const e = ends(board)
  if (!e) return 'both' // mesa vacía: cualquier ficha abre
  const fitsLeft = tile.x === e.left || tile.y === e.left
  const fitsRight = tile.x === e.right || tile.y === e.right
  if (fitsLeft && fitsRight) return 'both'
  if (fitsLeft) return 'left'
  if (fitsRight) return 'right'
  return null
}

/** Ids de fichas de la mano jugables ahora (respetando apertura forzada). */
export function playableTileIds(hand: readonly Tile[], board: readonly BoardTile[], forcedTileId: string | null): Set<string> {
  if (forcedTileId) return new Set([forcedTileId])
  const ids = new Set<string>()
  for (const t of hand) {
    if (playOption(t, board)) ids.add(t.id)
  }
  return ids
}

/** Coloca la ficha en un extremo (devuelve nueva cadena, no muta). */
export function applyPlay(board: readonly BoardTile[], tile: Tile, end: End): BoardTile[] {
  const isDouble = tile.x === tile.y
  if (board.length === 0) {
    return [{ id: tile.id, left: tile.x, right: tile.y, isDouble }]
  }
  const e = ends(board)!
  if (end === 'right') {
    const v = e.right
    const oriented = tile.x === v ? { left: tile.x, right: tile.y } : { left: tile.y, right: tile.x }
    return [...board, { id: tile.id, ...oriented, isDouble }]
  }
  const v = e.left
  const oriented = tile.x === v ? { left: tile.y, right: tile.x } : { left: tile.x, right: tile.y }
  return [{ id: tile.id, ...oriented, isDouble }, ...board]
}

/** Puntos totales de una mano (los dobles cuentan doble: 6|6 = 12). */
export function handPips(hand: readonly Tile[]): number {
  return hand.reduce((s, t) => s + t.x + t.y, 0)
}

/**
 * Calcula el desenlace de la ronda.
 * - 'domino': un jugador vació su mano → suma puntos de TODOS los rivales.
 * - 'block': nadie puede jugar → gana la mano más ligera → suma puntos de los rivales.
 * - 'tie': empate en la mano más ligera → nadie puntúa.
 */
export function roundResult(
  players: readonly Player[],
  type: 'domino' | 'block' | 'tie',
  winnerId: number | null
): RoundResult {
  const remaining = players.map((p) => ({
    playerId: p.id,
    name: p.name,
    pips: handPips(p.hand),
    tiles: [...p.hand],
  }))
  if (type === 'domino' && winnerId !== null) {
    const winner = players.find((p) => p.id === winnerId)!
    const points = remaining.filter((r) => r.playerId !== winnerId).reduce((s, r) => s + r.pips, 0)
    return {
      type,
      winnerId,
      winnerName: winner.name,
      points,
      remaining,
    }
  }
  if (type === 'block' && winnerId !== null) {
    const winner = players.find((p) => p.id === winnerId)!
    const points = remaining.filter((r) => r.playerId !== winnerId).reduce((s, r) => s + r.pips, 0)
    return { type, winnerId, winnerName: winner.name, points, remaining }
  }
  return { type: 'tie', winnerId: null, winnerName: '', points: 0, remaining }
}

/** Ganador del bloqueo: mano con menos puntos (o null si hay empate). */
export function blockedWinner(players: readonly Player[]): number | null {
  let min = Infinity
  let winner: number | null = null
  let tie = false
  for (const p of players) {
    const pips = handPips(p.hand)
    if (pips < min) {
      min = pips
      winner = p.id
      tie = false
    } else if (pips === min && winner !== p.id) {
      tie = true
    }
  }
  return tie ? null : winner
}

/** Copia players con una ficha menos y el tablero actualizado (utilidad interna del reducer). */
export function withoutTile(hand: readonly Tile[], tileId: string): Tile[] {
  return hand.filter((t) => t.id !== tileId)
}

export const DEFAULT_SETTINGS: Settings = {
  numPlayers: 2,
  difficulty: 'normal',
  targetScore: 100,
  sound: true,
}

export const TARGET_OPTIONS: (100 | 150 | 200)[] = [100, 150, 200]
