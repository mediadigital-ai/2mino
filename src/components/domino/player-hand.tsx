'use client'

/**
 * Zona inferior del jugador humano: barra de estado/acciones + soporte de fichas.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDownToLine, Ban, Hand } from 'lucide-react'
import { playOption } from '@/lib/domino/engine'
import { sfxClick } from '@/lib/domino/sound'
import type { BoardTile, End, Player, Tile } from '@/lib/domino/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { DominoTile } from './domino-tile'

interface PlayerHandProps {
  me: Player
  myTurn: boolean
  playables: Set<string>
  selectedTile: Tile | null
  forcedTileId: string | null
  mustDraw: boolean
  mustPass: boolean
  drawnThisTurn: number
  boneyardCount: number
  board: BoardTile[]
  currentName: string
  targetScore: number
  onSelectTile: (tileId: string) => void
  onPlay: (tileId: string, end: End) => void
  onDraw: () => void
  onPass: () => void
}

export function PlayerHand({
  me,
  myTurn,
  playables,
  selectedTile,
  forcedTileId,
  mustDraw,
  mustPass,
  drawnThisTurn,
  boneyardCount,
  board,
  currentName,
  targetScore,
  onSelectTile,
  onPlay,
  onDraw,
  onPass,
}: PlayerHandProps) {
  const handleTileClick = (tile: Tile) => {
    if (!myTurn) return
    if (forcedTileId && tile.id !== forcedTileId) return
    // Mesa vacía: la primera ficha se coloca directamente (no hay extremos que elegir)
    if (board.length === 0) {
      if (playables.has(tile.id)) onPlay(tile.id, 'right')
      return
    }
    const opt = playOption(tile, board)
    if (!opt) return
    if (opt === 'both') {
      if (selectedTile?.id !== tile.id) sfxClick()
      onSelectTile(tile.id)
      return
    }
    onPlay(tile.id, opt as End)
  }

  const selectedOption = selectedTile && board.length > 0 ? playOption(selectedTile, board) : null

  return (
    <section aria-label="Tu mano" className="flex flex-col gap-2">
      {/* Barra de estado y acciones */}
      <div className="flex min-h-[44px] flex-wrap items-center justify-between gap-2 rounded-xl border border-[#2a332c] bg-[#141b16]/95 px-3 py-2 shadow-md">
        <div className="flex items-center gap-2 text-sm">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-bold',
              myTurn ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/50' : 'bg-white/5 text-stone-300'
            )}
          >
            {myTurn && <Hand className="h-3.5 w-3.5" aria-hidden="true" />}
            {myTurn ? 'Tu turno' : `Turno de ${currentName}…`}
          </span>
          <span className="text-[12px] text-stone-400">
            Tú · <span className="font-bold text-stone-100">{me.score}</span>/{targetScore} pts
          </span>
          {drawnThisTurn > 0 && (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] text-stone-300">
              has robado {drawnThisTurn}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {myTurn && forcedTileId && (
            <span className="text-[12px] font-medium text-amber-200/90">
              Debes abrir con tu ficha más alta
            </span>
          )}
          {selectedTile && selectedOption === 'both' && (
            <div className="flex items-center gap-2">
              <span className="text-[12px] text-stone-300">Elige extremo:</span>
              <Button size="sm" variant="secondary" onClick={() => onPlay(selectedTile.id, 'left')}>
                ◄ Izquierda
              </Button>
              <Button size="sm" variant="secondary" onClick={() => onPlay(selectedTile.id, 'right')}>
                Derecha ►
              </Button>
            </div>
          )}
          {mustDraw && (
            <Button size="sm" className="animate-pulse bg-amber-500 font-bold text-[#201500] hover:bg-amber-400" onClick={onDraw}>
              <ArrowDownToLine className="mr-1 h-4 w-4" aria-hidden="true" />
              Robar ficha {boneyardCount > 0 && `(${boneyardCount})`}
            </Button>
          )}
          {mustPass && (
            <Button size="sm" variant="destructive" onClick={onPass}>
              <Ban className="mr-1 h-4 w-4" aria-hidden="true" />
              Pasar turno
            </Button>
          )}
        </div>
      </div>

      {/* Soporte de fichas */}
      <div
        className="rounded-2xl border border-[#2a1808] bg-[linear-gradient(180deg,#5c3a1e_0%,#4a2d14_55%,#38210b_100%)] p-2 shadow-[0_10px_24px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,220,170,0.22)] sm:p-3"
        style={{ '--u': 'clamp(30px, 8vw, 46px)' } as React.CSSProperties}
      >
        {me.hand.length === 0 ? (
          <p className="py-6 text-center text-sm font-semibold text-amber-200/80">¡Mano vacía!</p>
        ) : (
          <div className="flex flex-wrap items-end justify-center gap-1.5 sm:gap-2">
            <AnimatePresence initial={false}>
              {me.hand.map((tile) => {
                const playable = playables.has(tile.id)
                const selected = selectedTile?.id === tile.id
                return (
                  <motion.div
                    key={tile.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.7 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -40, scale: 0.6, rotate: -12 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                    className="flex pb-1"
                  >
                    <DominoTile
                      as="button"
                      vertical
                      left={tile.x}
                      right={tile.y}
                      playable={playable}
                      selected={selected}
                      dimmed={myTurn && !playable}
                      onClick={() => handleTileClick(tile)}
                    />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </section>
  )
}
