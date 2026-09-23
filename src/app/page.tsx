'use client'

/**
 * Dominó Clásico — página principal.
 * Partida contra la CPU con reglas clásicas de robar (doble seis, 28 fichas).
 */
import { useEffect, useMemo, useState } from 'react'
import { playOption } from '@/lib/domino/engine'
import { setSoundEnabled } from '@/lib/domino/sound'
import type { BoardTile, End, Settings } from '@/lib/domino/types'
import { useDominoGame } from '@/hooks/use-domino-game'
import { Board, type EndSelection } from '@/components/domino/board'
import { GameEndDialog, RoundEndDialog, RulesDialog } from '@/components/domino/dialogs'
import { HeaderBar } from '@/components/domino/header-bar'
import { MenuScreen, type MenuStats } from '@/components/domino/menu-screen'
import { LatestAction, MoveLog } from '@/components/domino/move-log'
import { OpponentPanel } from '@/components/domino/opponent-panel'
import { PlayerHand } from '@/components/domino/player-hand'

export default function Home() {
  const { state, me, myTurn, ends: boardEnds, playables, selectedTile, mustDraw, mustPass, actions } = useDominoGame()
  const [rulesOpen, setRulesOpen] = useState(false)
  const [menuSettings, setMenuSettings] = useState<Settings | null>(null)
  const [stats, setStats] = useState<MenuStats | null>(null)
  const [exitConfirm, setExitConfirm] = useState(false)

  // Sonido global según ajustes
  useEffect(() => {
    setSoundEnabled(state.settings.sound)
  }, [state.settings.sound])

  // Ajustes editables del menú (recuerdan la última configuración usada)
  const activeSettings = menuSettings ?? state.settings

  // Estadísticas locales: datos solo disponibles en cliente tras el montaje
  useEffect(() => {
    try {
      const raw = localStorage.getItem('domino-stats')
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación de almacenamiento local
        setStats(JSON.parse(raw) as MenuStats)
      }
    } catch {
      /* sin estadísticas */
    }
  }, [state.phase])

  // Registrar partida terminada
  const gameEndKey = state.phase === 'gameEnd' ? state.seq : null
  useEffect(() => {
    if (gameEndKey === null) return
    try {
      const raw = localStorage.getItem('domino-stats')
      const prev = raw ? (JSON.parse(raw) as MenuStats) : { played: 0, wins: 0 }
      const next: MenuStats = { played: prev.played + 1, wins: prev.wins + (state.gameWinnerId === 0 ? 1 : 0) }
      localStorage.setItem('domino-stats', JSON.stringify(next))
    } catch {
      /* almacenamiento no disponible */
    }
  }, [gameEndKey, state.gameWinnerId])

  // Selección de extremo del humano (ficha que encaja en ambos extremos)
  const selection: EndSelection | null = useMemo(() => {
    if (!selectedTile || !boardEnds) return null
    const opt = playOption(selectedTile, state.board)
    if (opt !== 'both') return null
    return {
      tileId: selectedTile.id,
      fitsLeft: true,
      fitsRight: true,
      leftValue: boardEnds.left,
      rightValue: boardEnds.right,
    }
  }, [selectedTile, boardEnds, state.board])

  // ---------------------------------------------------------------------------
  // Menú
  // ---------------------------------------------------------------------------
  if (state.phase === 'menu') {
    return (
      <>
        <MenuScreen
          settings={activeSettings}
          stats={stats}
          onChange={(patch) => setMenuSettings({ ...activeSettings, ...patch })}
          onStart={(s) => actions.start(s)}
          onOpenRules={() => setRulesOpen(true)}
        />
        <RulesDialog open={rulesOpen} onOpenChange={setRulesOpen} />
      </>
    )
  }

  const opponents = state.players.slice(1)
  const currentName = state.players[state.current]?.name ?? ''
  const leaderScore = Math.max(...state.players.map((p) => p.score))

  return (
    <div className="flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_50%_-10%,#16211a_0%,#0d120e_55%,#090c09_100%)] text-stone-100">
      <HeaderBar
        round={state.round}
        targetScore={state.settings.targetScore}
        players={state.players}
        current={state.current}
        soundOn={state.settings.sound}
        onToggleSound={() => actions.toggleSound()}
        onOpenRules={() => setRulesOpen(true)}
        onExit={() => setExitConfirm(true)}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-3 p-3 lg:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          {/* Rivales */}
          {opponents.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {opponents.map((p) => (
                <OpponentPanel
                  key={p.id}
                  player={p}
                  isCurrent={state.current === p.id && state.phase === 'playing'}
                  targetScore={state.settings.targetScore}
                  drawnThisTurn={state.current === p.id ? state.drawnThisTurn : 0}
                  isLeader={p.score === leaderScore && p.score > 0}
                />
              ))}
            </div>
          )}

          {/* Mesa */}
          <Board
            board={state.board}
            lastPlacedId={state.lastPlacedId}
            phase={state.phase}
            selection={selection}
            boneyardCount={state.boneyard.length}
            canDraw={mustDraw}
            starterName={state.players[state.current]?.name ?? ''}
            onChooseEnd={(end: End) => actions.chooseEnd(end)}
            onDraw={() => actions.draw()}
          />

          {/* Mano del jugador */}
          {me && (
            <PlayerHand
              me={me}
              myTurn={myTurn}
              playables={playables}
              selectedTile={selectedTile}
              forcedTileId={state.forcedTileId}
              mustDraw={mustDraw}
              mustPass={mustPass}
              drawnThisTurn={state.drawnThisTurn}
              boneyardCount={state.boneyard.length}
              board={state.board as BoardTile[]}
              currentName={currentName}
              targetScore={state.settings.targetScore}
              onSelectTile={(id) => actions.selectTile(id)}
              onPlay={(id, end) => actions.play(id, end)}
              onDraw={() => actions.draw()}
              onPass={() => actions.pass()}
            />
          )}

          {/* Última acción (móvil) */}
          <div className="lg:hidden">
            <LatestAction log={state.log} />
          </div>
        </div>

        {/* Historial (escritorio) */}
        <MoveLog log={state.log} round={state.round} />
      </main>

      {/* Diálogos */}
      {state.phase === 'roundEnd' && <RoundEndDialog state={state} onNextRound={() => actions.nextRound()} />}
      {state.phase === 'gameEnd' && (
        <GameEndDialog state={state} onPlayAgain={() => actions.playAgain()} onMenu={() => actions.toMenu()} />
      )}
      <RulesDialog open={rulesOpen} onOpenChange={setRulesOpen} />

      {/* Confirmación de salida */}
      {exitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar salida"
        >
          <div className="w-full max-w-xs rounded-2xl border border-[#2a332c] bg-[#141b16] p-5 text-center shadow-2xl">
            <p className="text-base font-bold text-stone-100">¿Abandonar la partida?</p>
            <p className="mt-1 text-sm text-stone-400">Se perderá el progreso de esta partida.</p>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                className="h-10 flex-1 cursor-pointer rounded-lg border border-[#2a332c] bg-white/5 text-sm font-bold text-stone-200 hover:bg-white/10"
                onClick={() => setExitConfirm(false)}
              >
                Seguir jugando
              </button>
              <button
                type="button"
                className="h-10 flex-1 cursor-pointer rounded-lg bg-rose-600 text-sm font-bold text-white hover:bg-rose-500"
                onClick={() => {
                  setExitConfirm(false)
                  actions.toMenu()
                }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
