/**
 * Dominó Clásico — Inteligencia artificial de la CPU
 *
 * - Fácil: juega una ficha válida al azar.
 * - Normal: descarga fichas pesadas, prioriza dobles.
 * - Difícil: añade conteo de palos, flexibilidad de mano, control de extremos
 *   y bloqueo de rivales detectado por pases/robos.
 */
import { ends, playOption } from './engine'
import type { BoardTile, Difficulty, End, Player, Tile } from './types'

export interface AIMove {
  tileId: string
  end: End
}

export interface AIContext {
  /** Jugador CPU que decide */
  player: Player
  board: BoardTile[]
  difficulty: Difficulty
  /** Número total de fichas de cada valor ya vistas en mesa (7 max por valor) */
  playedValues: number[]
  /** Extremos que cada rival no pudo igualar (por pases recientes), indexado por playerId */
  rivalBlockedValues: Map<number, Set<number>>
  /** Resto de fichas en el montón */
  boneyardCount: number
}

const randomOf = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)]

/** Todas las jugadas legales de la mano. */
function legalMoves(hand: readonly Tile[], board: readonly BoardTile[], forcedTileId: string | null): AIMove[] {
  const moves: AIMove[] = []
  for (const t of hand) {
    if (forcedTileId && t.id !== forcedTileId) continue
    const opt = playOption(t, board)
    if (opt === 'left' || opt === 'both') moves.push({ tileId: t.id, end: 'left' })
    if (opt === 'right' || opt === 'both') moves.push({ tileId: t.id, end: 'right' })
    if (opt === null && board.length === 0) {
      // Mesa vacía: cualquier ficha (solo posible con apertura forzada)
      moves.push({ tileId: t.id, end: 'right' })
    }
  }
  return moves
}

export function chooseAIMove(ctx: AIContext, forcedTileId: string | null): AIMove | null {
  const moves = legalMoves(ctx.player.hand, ctx.board, forcedTileId)
  if (moves.length === 0) return null
  if (moves.length === 1) return moves[0]

  switch (ctx.difficulty) {
    case 'facil':
      return randomOf(moves)
    case 'normal':
      return bestNormal(moves, ctx)
    case 'dificil':
      return bestHard(moves, ctx)
  }
}

/** Normal: puntúa cada jugada con heurísticas sencillas. */
function bestNormal(moves: AIMove[], ctx: AIContext): AIMove {
  let best = moves[0]
  let bestScore = -Infinity
  for (const m of moves) {
    const tile = ctx.player.hand.find((t) => t.id === m.tileId)!
    let s = tile.x + tile.y // descargar peso
    if (tile.x === tile.y) s += 4 // los dobles son difíciles de colocar luego
    s += Math.random() // desempate con algo de variedad
    if (s > bestScore) {
      bestScore = s
      best = m
    }
  }
  return best
}

/** Extremo resultante de jugar una ficha en un extremo dado. */
function resultingEndValue(tile: Tile, board: BoardTile[], end: End): number {
  const e = ends(board)
  if (!e) return Math.max(tile.x, tile.y)
  const v = end === 'left' ? e.left : e.right
  return tile.x === v ? tile.y : tile.x
}

/** Valores que aún quedan ocultos (mano propia, montón o rivales) por palo. */
function unseenTilesPerValue(ctx: AIContext): number[] {
  // 7 fichas por valor (0..6) menos las ya en mesa y las de mi mano
  const unseen = Array.from({ length: 7 }, () => 7)
  for (const bt of ctx.board) {
    unseen[bt.left]--
    if (bt.isDouble) unseen[bt.right]-- // el doble aporta 2 al mismo palo... ya restado por left/right distintos
    else unseen[bt.right]--
  }
  // Nota: un doble x|x resta 1 con left y 1 con right (mismo palo) → correcto: consume 2 del palo.
  for (const t of ctx.player.hand) {
    unseen[t.x]--
    unseen[t.y]--
  }
  return unseen
}

/** Difícil: heurística compuesta. */
function bestHard(moves: AIMove[], ctx: AIContext): AIMove {
  const hand = ctx.player.hand
  const unseen = unseenTilesPerValue(ctx)
  const handSize = hand.length
  const lateGame = handSize <= 3 && ctx.boneyardCount === 0

  let best = moves[0]
  let bestScore = -Infinity
  for (const m of moves) {
    const tile = hand.find((t) => t.id === m.tileId)!
    let s = 0

    // 1) Descargar peso (siempre importa, más al final)
    s += (tile.x + tile.y) * (lateGame ? 1.5 : 1.0)

    // 2) Los dobles se quedan atascados: colocarlos pronto
    if (tile.x === tile.y) s += 6

    // 3) Flexibilidad: cuántos palos distintos me quedan tras jugar
    const rest = hand.filter((t) => t.id !== tile.id)
    const suitsRest = new Set<number>()
    for (const t of rest) {
      suitsRest.add(t.x)
      suitsRest.add(t.y)
    }
    s += suitsRest.size * 2

    // 4) Palos muertos: si un palo casi agotado está en mi ficha, descargarla
    s += (7 - Math.min(unseen[tile.x], unseen[tile.y])) * 1.2

    // 5) Control de extremo: mantener extremos que yo pueda seguir alimentando
    if (lateGame) {
      const newVal = resultingEndValue(tile, ctx.board, m.end)
      const canFeed = rest.some((t) => t.x === newVal || t.y === newVal)
      if (canFeed) s += 10
    }

    // 6) Bloquear rivales: crear extremos con valores que saben que no tienen
    const newVal = resultingEndValue(tile, ctx.board, m.end)
    for (const [, blocked] of ctx.rivalBlockedValues) {
      if (blocked.has(newVal)) s += 8
    }

    // 7) Proteger el dominó: si me quedo con 2 fichas y una encaja con la otra, priorizar secuencia
    if (handSize === 2 && rest.length === 1) {
      const last = rest[0]
      if (last.x === newVal || last.y === newVal) s += 40
    }

    s += Math.random() * 2 // pequeña variedad para no ser predecible

    if (s > bestScore) {
      bestScore = s
      best = m
    }
  }
  return best
}

/** Descripción de cada dificultad para los paneles informativos. */
export function aiDescription(difficulty: Difficulty): string {
  switch (difficulty) {
    case 'facil':
      return 'Juega al azar entre sus opciones válidas.'
    case 'normal':
      return 'Descarga fichas pesadas y prioriza dobles.'
    case 'dificil':
      return 'Cuenta palos, controla extremos y te bloquea.'
  }
}
