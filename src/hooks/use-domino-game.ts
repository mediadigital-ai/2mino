'use client'

/**
 * Dominó Clásico — Hook de estado del juego.
 * Reducer puro + efectos para turnos async de la CPU, sonidos y persistencia.
 */
import { useEffect, useMemo, useReducer, useRef } from 'react'
import { chooseAIMove, type AIContext } from '@/lib/domino/ai'
import {
  applyPlay,
  blockedWinner,
  createPlayers,
  deal as dealCards,
  DEFAULT_SETTINGS,
  ends,
  handSize,
  openingPlayerAndTile,
  playOption,
  roundResult,
} from '@/lib/domino/engine'
import {
  sfxDraw,
  sfxPass,
  sfxPlace,
  sfxRoundLose,
  sfxRoundWin,
  sfxShuffle,
  sfxWin,
} from '@/lib/domino/sound'
import { tileLabel, type End, type GameState, type LogEntry, type Settings, type Tile } from '@/lib/domino/types'

// ----------------------------------------------------------------------------
// Estado inicial
// ----------------------------------------------------------------------------

const initialState: GameState = {
  phase: 'menu',
  settings: DEFAULT_SETTINGS,
  players: [],
  board: [],
  boneyard: [],
  current: 0,
  passes: 0,
  round: 0,
  log: [],
  roundResult: null,
  selectedTileId: null,
  lastPlacedId: null,
  forcedTileId: null,
  seq: 0,
  drawnThisTurn: 0,
  gameWinnerId: null,
  lacks: [],
}

// ----------------------------------------------------------------------------
// Acciones
// ----------------------------------------------------------------------------

export type Action =
  | { type: 'START'; settings: Settings }
  | { type: 'DEALT' }
  | { type: 'HYDRATE'; settings: Settings }
  | { type: 'SELECT_TILE'; tileId: string | null }
  | { type: 'PLAY'; tileId: string; end: End }
  | { type: 'CHOOSE_END'; end: End }
  | { type: 'DRAW' }
  | { type: 'PASS' }
  | { type: 'AI_STEP'; seq: number }
  | { type: 'NEXT_ROUND' }
  | { type: 'PLAY_AGAIN' }
  | { type: 'MENU' }
  | { type: 'TOGGLE_SOUND' }

// ----------------------------------------------------------------------------
// Reducer
// ----------------------------------------------------------------------------

function pushLog(s: GameState, player: string, text: string, kind: LogEntry['kind'], idTag = 0): LogEntry[] {
  const entry: LogEntry = { id: s.seq * 10 + idTag, round: s.round, player, text, kind }
  return [...s.log.slice(-80), entry]
}

/** Añade a lacks[p] los valores que p no pudo igualar (info para la IA). */
function addLacks(state: GameState, p: number, values: number[]): number[][] {
  const cur = state.lacks.map((set) => new Set(set))
  while (cur.length <= p) cur.push(new Set<number>())
  for (const v of values) cur[p].add(v)
  return cur.map((set) => Array.from(set))
}

function removeLacks(state: GameState, p: number, values: number[]): number[][] {
  if (!state.lacks[p]) return state.lacks
  const cur = state.lacks.map((set) => new Set(set))
  for (const v of values) cur[p].delete(v)
  return cur.map((set) => Array.from(set))
}

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'START': {
      const { settings } = action
      const { hands, boneyard } = dealCards(settings.numPlayers)
      const players = createPlayers(settings, hands)
      const open = openingPlayerAndTile(hands)
      return {
        ...initialState,
        settings,
        players,
        boneyard,
        current: open.player,
        forcedTileId: open.tile.id,
        lacks: hands.map(() => [] as number[]),
        phase: 'dealing',
        round: 1,
        seq: state.seq + 1,
        log: [
          {
            id: state.seq * 10,
            round: 1,
            player: '',
            text: `Partida a ${settings.targetScore} puntos · ${settings.numPlayers} jugadores`,
            kind: 'system',
          },
          {
            id: state.seq * 10 + 1,
            round: 1,
            player: '',
            text: `Abre ${players[open.player].name} con ${tileLabel(open.tile)}`,
            kind: 'system',
          },
        ],
      }
    }

    case 'HYDRATE': {
      if (state.phase !== 'menu') return state
      return { ...state, settings: action.settings, seq: state.seq + 1 }
    }

    case 'DEALT': {
      if (state.phase !== 'dealing') return state
      return { ...state, phase: 'playing', seq: state.seq + 1 }
    }

    case 'SELECT_TILE': {
      if (state.phase !== 'playing' || state.players[state.current]?.isAI) return state
      const nextSelected = state.selectedTileId === action.tileId ? null : action.tileId
      return { ...state, selectedTileId: nextSelected, seq: state.seq + 1 }
    }

    case 'PLAY': {
      if (state.phase !== 'playing') return state
      const p = state.players[state.current]
      if (!p || p.isAI) return state
      return applyPlayAction(state, state.current, action.tileId, action.end)
    }

    case 'CHOOSE_END': {
      if (state.phase !== 'playing' || !state.selectedTileId) return state
      const p = state.players[state.current]
      if (!p || p.isAI) return state
      const tile = p.hand.find((t) => t.id === state.selectedTileId)
      if (!tile) return state
      const opt = playOption(tile, state.board)
      if (opt !== 'both' && opt !== action.end) return state
      return applyPlayAction(state, state.current, tile.id, action.end)
    }

    case 'DRAW': {
      if (state.phase !== 'playing') return state
      const p = state.players[state.current]
      if (!p || p.isAI) return state
      const hasPlayable = p.hand.some((t) => playOption(t, state.board))
      if (hasPlayable || state.boneyard.length === 0) return state
      return applyDraw(state, state.current)
    }

    case 'PASS': {
      if (state.phase !== 'playing') return state
      const p = state.players[state.current]
      if (!p || p.isAI) return state
      const hasPlayable = p.hand.some((t) => playOption(t, state.board))
      if (hasPlayable || state.boneyard.length > 0) return state
      return applyPass(state, state.current)
    }

    case 'AI_STEP': {
      if (action.seq !== state.seq) return state // paso obsoleto (StrictMode / duplicado)
      if (state.phase !== 'playing') return state
      const p = state.players[state.current]
      if (!p || !p.isAI) return state

      const forced = state.forcedTileId
      const hasPlayable = p.hand.some((t) => (!forced || t.id === forced ? playOption(t, state.board) : null))

      if (hasPlayable) {
        const ctx = buildAIContext(state)
        const move = chooseAIMove(ctx, forced)
        if (move) return applyPlayAction(state, state.current, move.tileId, move.end)
        return state
      }
      if (state.boneyard.length > 0) {
        return applyDraw(state, state.current)
      }
      return applyPass(state, state.current)
    }

    case 'NEXT_ROUND': {
      if (state.phase !== 'roundEnd') return state
      return startNextRound(state)
    }

    case 'PLAY_AGAIN': {
      if (state.phase !== 'gameEnd') return state
      const { settings } = state
      const { hands, boneyard } = dealCards(settings.numPlayers)
      const players = createPlayers(settings, hands)
      const open = openingPlayerAndTile(hands)
      return {
        ...initialState,
        settings,
        players,
        boneyard,
        current: open.player,
        forcedTileId: open.tile.id,
        lacks: hands.map(() => [] as number[]),
        phase: 'dealing',
        round: 1,
        seq: state.seq + 1,
        log: [
          {
            id: state.seq * 10,
            round: 1,
            player: '',
            text: `Nueva partida a ${settings.targetScore} puntos`,
            kind: 'system',
          },
        ],
      }
    }

    case 'MENU': {
      return { ...initialState, settings: state.settings, seq: state.seq + 1 }
    }

    case 'TOGGLE_SOUND': {
      const settings = { ...state.settings, sound: !state.settings.sound }
      try {
        localStorage.setItem('domino-settings', JSON.stringify(settings))
      } catch {
        /* almacenamiento no disponible */
      }
      return { ...state, settings, seq: state.seq + 1 }
    }

    default:
      return state
  }
}

// ----------------------------------------------------------------------------
// Operaciones internas del reducer (inmutables)
// ----------------------------------------------------------------------------

function applyPlayAction(state: GameState, playerId: number, tileId: string, end: End): GameState {
  const p = state.players[playerId]
  const tile = p.hand.find((t) => t.id === tileId)
  if (!tile) return state
  if (state.forcedTileId && state.forcedTileId !== tileId) return state
  const opt = playOption(tile, state.board)
  if (opt !== 'both' && opt !== end) return state

  const board = applyPlay(state.board, tile, end)
  const players = state.players.map((pl) =>
    pl.id === playerId ? { ...pl, hand: pl.hand.filter((t) => t.id !== tileId) } : pl
  )
  const lacks = removeLacks(state, playerId, [tile.x, tile.y])
  const isOpening = state.forcedTileId === tileId
  const next: GameState = {
    ...state,
    players,
    board,
    lacks,
    passes: 0,
    forcedTileId: null,
    selectedTileId: null,
    lastPlacedId: tileId,
    drawnThisTurn: 0,
    log: pushLog(state, p.name, isOpening ? `abre con ${tileLabel(tile)}` : `juega ${tileLabel(tile)}`, 'play'),
    seq: state.seq + 1,
  }

  // ¿Dominó? Se vació la mano
  if (players[playerId].hand.length === 0) {
    return finishRound(next, 'domino', playerId)
  }
  return { ...next, current: (playerId + 1) % players.length }
}

function applyDraw(state: GameState, playerId: number): GameState {
  const p = state.players[playerId]
  if (state.boneyard.length === 0) return state
  const [drawn, ...rest] = state.boneyard
  const e = ends(state.board)
  const lacks = e ? addLacks(state, playerId, [e.left, e.right]) : state.lacks
  const players = state.players.map((pl) => (pl.id === playerId ? { ...pl, hand: [...pl.hand, drawn] } : pl))
  return {
    ...state,
    players,
    boneyard: rest,
    lacks,
    drawnThisTurn: state.drawnThisTurn + 1,
    log: pushLog(state, p.name, 'roba del montón', 'draw'),
    seq: state.seq + 1,
  }
}

function applyPass(state: GameState, playerId: number): GameState {
  const p = state.players[playerId]
  const e = ends(state.board)
  const lacks = e ? addLacks(state, playerId, [e.left, e.right]) : state.lacks
  const passes = state.passes + 1
  const n = state.players.length
  const next: GameState = {
    ...state,
    passes,
    lacks,
    selectedTileId: null,
    drawnThisTurn: 0,
    log: pushLog(state, p.name, 'pasa', 'pass'),
    seq: state.seq + 1,
  }
  if (passes >= n) {
    const winner = blockedWinner(state.players)
    return finishRound(next, winner === null ? 'tie' : 'block', winner)
  }
  return { ...next, current: (playerId + 1) % n }
}

function finishRound(state: GameState, type: 'domino' | 'block' | 'tie', winnerId: number | null): GameState {
  const result = roundResult(state.players, type, winnerId)
  const players = state.players.map((p) => (p.id === winnerId ? { ...p, score: p.score + result.points } : p))
  let logText: string
  if (type === 'domino') logText = `¡Dominó de ${result.winnerName}! +${result.points} puntos`
  else if (type === 'block') logText = `Bloqueo: gana ${result.winnerName} (+${result.points} puntos)`
  else logText = 'Bloqueo con empate: nadie puntúa'
  const next: GameState = {
    ...state,
    players,
    phase: 'roundEnd',
    roundResult: result,
    log: pushLog(state, '', logText, 'round', 1),
    seq: state.seq + 1,
  }
  const winner = players.find((p) => p.id === winnerId)
  if (winner && winner.score >= state.settings.targetScore) {
    return {
      ...next,
      phase: 'gameEnd',
      gameWinnerId: winner.id,
      log: pushLog(next, '', `¡${winner.name} gana la partida con ${winner.score} puntos!`, 'round', 2),
    }
  }
  return next
}

function startNextRound(state: GameState): GameState {
  const { settings } = state
  const { hands, boneyard } = dealCards(settings.numPlayers)
  const players = state.players.map((p, i) => ({ ...p, hand: hands[i] }))
  const open = openingPlayerAndTile(hands)
  return {
    ...state,
    players,
    boneyard,
    board: [],
    current: open.player,
    forcedTileId: open.tile.id,
    lacks: hands.map(() => [] as number[]),
    passes: 0,
    round: state.round + 1,
    roundResult: null,
    selectedTileId: null,
    lastPlacedId: null,
    drawnThisTurn: 0,
    phase: 'dealing',
    log: pushLog(state, '', `Ronda ${state.round + 1}: abre ${players[open.player].name} con ${tileLabel(open.tile)}`, 'round', 1),
    seq: state.seq + 1,
  }
}

function buildAIContext(state: GameState): AIContext {
  const me = state.players[state.current]
  const playedValues = Array.from({ length: 7 }, (_, v) =>
    state.board.reduce((s, bt) => s + (bt.left === v ? 1 : 0) + (bt.right === v ? 1 : 0), 0)
  )
  const rivalBlockedValues = new Map<number, Set<number>>()
  for (const p of state.players) {
    if (p.id === me.id) continue
    rivalBlockedValues.set(p.id, new Set(state.lacks[p.id] ?? []))
  }
  return {
    player: me,
    board: state.board,
    difficulty: state.settings.difficulty,
    playedValues,
    rivalBlockedValues,
    boneyardCount: state.boneyard.length,
  }
}

// ----------------------------------------------------------------------------
// Hook
// ----------------------------------------------------------------------------

export function useDominoGame() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const dealtSeqRef = useRef(-1)
  const logLenRef = useRef(0)

  // Efecto: transición dealing → playing (animación de reparto)
  useEffect(() => {
    if (state.phase !== 'dealing') return
    if (dealtSeqRef.current === state.seq) return
    dealtSeqRef.current = state.seq
    sfxShuffle()
    const t = setTimeout(() => dispatch({ type: 'DEALT' }), 1200)
    return () => clearTimeout(t)
  }, [state.phase, state.seq])

  // Efecto: sonidos según últimas entradas del log
  useEffect(() => {
    if (state.log.length === logLenRef.current) return
    const fresh = state.log.slice(Math.min(logLenRef.current, state.log.length))
    logLenRef.current = state.log.length
    fresh.forEach((entry, i) => {
      const isLast = i === fresh.length - 1
      switch (entry.kind) {
        case 'play':
          sfxPlace()
          break
        case 'draw':
          sfxDraw()
          break
        case 'pass':
          sfxPass()
          break
        case 'round': {
          if (!isLast) break
          if (state.phase === 'gameEnd') {
            if (state.gameWinnerId === 0) sfxWin()
            else sfxRoundLose()
          } else if (state.roundResult) {
            if (state.roundResult.winnerId === 0) sfxRoundWin()
            else sfxRoundLose()
          }
          break
        }
      }
    })
  }, [state.log, state.phase, state.roundResult, state.gameWinnerId])

  // Efecto: turnos de la CPU (un micro-paso por timeout, con guarda de seq)
  useEffect(() => {
    if (state.phase !== 'playing') return
    const p = state.players[state.current]
    if (!p || !p.isAI) return
    const forced = state.forcedTileId
    const hasPlayable = p.hand.some((t) => (!forced || t.id === forced ? playOption(t, state.board) : null))
    const delay = hasPlayable
      ? 850 + Math.random() * 700
      : state.boneyard.length > 0
        ? 430
        : 750
    const seq = state.seq
    const t = setTimeout(() => dispatch({ type: 'AI_STEP', seq }), delay)
    return () => clearTimeout(t)
  }, [state.phase, state.current, state.seq, state.players, state.board, state.boneyard, state.forcedTileId])

  // Efecto: hidratar ajustes guardados
  useEffect(() => {
    try {
      const raw = localStorage.getItem('domino-settings')
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Settings>
        dispatch({ type: 'HYDRATE', settings: { ...DEFAULT_SETTINGS, ...parsed } as Settings })
      }
    } catch {
      /* sin datos guardados */
    }
  }, [])

  // Derivados para la UI
  const derived = useMemo(() => {
    const me = state.players[0] ?? null
    const myTurn = state.phase === 'playing' && state.current === 0
    const e = ends(state.board)
    const playables = new Set<string>()
    if (me && myTurn) {
      for (const t of me.hand) {
        if (state.forcedTileId && t.id !== state.forcedTileId) continue
        if (playOption(t, state.board)) playables.add(t.id)
      }
    }
    const selectedTile: Tile | null =
      me && state.selectedTileId ? (me.hand.find((t) => t.id === state.selectedTileId) ?? null) : null
    const mustDraw = myTurn && playables.size === 0 && state.boneyard.length > 0
    const mustPass = myTurn && playables.size === 0 && state.boneyard.length === 0
    const handTotal = handSize(state.settings.numPlayers)
    return { me, myTurn, ends: e, playables, selectedTile, mustDraw, mustPass, handTotal }
  }, [state])

  const actions = useMemo(
    () => ({
      start: (settings: Settings) => {
        try {
          localStorage.setItem('domino-settings', JSON.stringify(settings))
        } catch {
          /* almacenamiento no disponible */
        }
        dispatch({ type: 'START', settings })
      },
      selectTile: (tileId: string | null) => dispatch({ type: 'SELECT_TILE', tileId }),
      play: (tileId: string, end: End) => dispatch({ type: 'PLAY', tileId, end }),
      chooseEnd: (end: End) => dispatch({ type: 'CHOOSE_END', end }),
      draw: () => dispatch({ type: 'DRAW' }),
      pass: () => dispatch({ type: 'PASS' }),
      nextRound: () => dispatch({ type: 'NEXT_ROUND' }),
      playAgain: () => dispatch({ type: 'PLAY_AGAIN' }),
      toMenu: () => dispatch({ type: 'MENU' }),
      toggleSound: () => dispatch({ type: 'TOGGLE_SOUND' }),
    }),
    []
  )

  return { state, ...derived, actions } as const
}

export type UseDominoGame = ReturnType<typeof useDominoGame>
