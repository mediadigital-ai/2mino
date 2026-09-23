'use client'

/**
 * Mesa de fieltro: cadena de fichas en serpiente (dobla en las esquinas como
 * el dominó real), zonas de extremos, montón y overlay de reparto.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react'
import type { BoardTile as BTile, End } from '@/lib/domino/types'
import { cn } from '@/lib/utils'
import { DominoTile, NumberBadge, TileBack } from './domino-tile'
import { layoutSnake, type Slot } from './snake-layout'

export interface EndSelection {
  tileId: string
  fitsLeft: boolean
  fitsRight: boolean
  leftValue: number | null
  rightValue: number | null
}

interface BoardProps {
  board: BTile[]
  lastPlacedId: string | null
  phase: 'menu' | 'dealing' | 'playing' | 'roundEnd' | 'gameEnd'
  selection: EndSelection | null
  boneyardCount: number
  canDraw: boolean
  starterName: string
  onChooseEnd: (end: End) => void
  onDraw: () => void
}

export function Board({
  board,
  lastPlacedId,
  phase,
  selection,
  boneyardCount,
  canDraw,
  starterName,
  onChooseEnd,
  onDraw,
}: BoardProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [u, setU] = useState(0)

  // Medir el ancho/alto disponible de la mesa (content-box, sin padding)
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setSize({ w: e.contentRect.width, h: e.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Unidad de ficha: misma fórmula que la variable CSS --u del contenedor
  useEffect(() => {
    const calc = () => setU(Math.round(Math.max(19, Math.min(34, window.innerWidth * 0.046))))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  // Ancla estable: la ficha de apertura queda en el centro de la mesa.
  // Dentro de una ronda la cadena solo crece por los extremos, así que las
  // fichas existentes nunca cambian de lado al recalcular el layout.
  const anchorIdRef = useRef<string | null>(null)
  const anchorIdx = useMemo(() => {
    if (board.length === 0) {
      anchorIdRef.current = null
      return -1
    }
    const prev = anchorIdRef.current
    if (prev) {
      const idx = board.findIndex((t) => t.id === prev)
      if (idx >= 0) return idx
    }
    const idx = Math.floor((board.length - 1) / 2)
    anchorIdRef.current = board[idx].id
    return idx
  }, [board])

  const layout = useMemo(
    () => (u > 0 && size.w > 0 ? layoutSnake(board, size.w, u, anchorIdx) : null),
    [board, size.w, u, anchorIdx]
  )

  // Auto-scroll a la última ficha colocada
  useEffect(() => {
    if (!lastPlacedId || !scrollRef.current) return
    const el = scrollRef.current.querySelector<HTMLElement>(`[data-tile-id="${lastPlacedId}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
  }, [lastPlacedId, board.length])

  return (
    <section
      aria-label="Mesa de juego"
      className="relative rounded-2xl border border-[#2a1808] bg-[linear-gradient(150deg,#6b4423_0%,#543318_45%,#3c2310_100%)] p-[6px] shadow-[0_14px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,220,170,0.25)] sm:p-2"
    >
      <div
        ref={scrollRef}
        className="scrollbar-thin relative flex min-h-[240px] flex-col overflow-y-auto rounded-xl bg-[radial-gradient(ellipse_at_50%_38%,#1f7550_0%,#155c3a_52%,#0b3d26_100%)] p-3 sm:min-h-[320px] sm:p-5"
        style={{ '--u': 'clamp(19px, 4.6vw, 34px)' } as React.CSSProperties}
      >
        {/* Insignias de extremos */}
        {board.length > 0 && phase === 'playing' && (
          <div className="pointer-events-none absolute right-2 top-2 z-10 flex items-center gap-1.5 rounded-full border border-white/10 bg-black/35 px-2.5 py-1 text-[11px] font-semibold text-emerald-100/90 backdrop-blur-sm">
            Extremos
            <NumberBadge value={board[0].left} className="h-5 w-5 text-[12px]" />
            <span className="text-white/40">·</span>
            <NumberBadge value={board[board.length - 1].right} className="h-5 w-5 text-[12px]" />
          </div>
        )}

        {/* Montón */}
        {phase !== 'menu' && (
          <button
            type="button"
            onClick={canDraw ? onDraw : undefined}
            aria-label={canDraw ? 'Robar ficha del montón' : `Montón: ${boneyardCount} fichas`}
            className={cn(
              'absolute bottom-2 right-2 z-10 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-[11px] font-semibold text-emerald-100/90 backdrop-blur-sm',
              canDraw && 'animate-pulse cursor-pointer border-amber-300/60 bg-amber-400/15 text-amber-100'
            )}
          >
            <span className="relative flex items-center">
              <TileBack className="-rotate-6 translate-y-[3px] opacity-80" />
              <TileBack className="absolute -left-[5px] top-[-4px] rotate-[8deg] opacity-90" />
            </span>
            <Layers className="h-3.5 w-3.5 opacity-70" aria-hidden="true" />
            {boneyardCount > 0 ? `${boneyardCount}` : 'vacío'}
            {canDraw && <span className="ml-1 text-amber-200">· Robar</span>}
          </button>
        )}

        {/* Cadena de fichas (serpiente) */}
        {board.length === 0 ? (
          <div className="my-auto flex min-h-[200px] w-full flex-col items-center justify-center gap-3 text-center sm:min-h-[280px]">
            <div className="flex gap-1 opacity-60" aria-hidden="true">
              <DominoTile left={6} right={6} vertical />
              <DominoTile left={5} right={3} />
              <DominoTile left={4} right={2} />
            </div>
            <p className="text-sm font-medium text-emerald-100/70">
              Mesa vacía — <span className="font-bold text-amber-200">{starterName}</span> abre la partida
              {phase === 'playing' && ' con su ficha más alta'}
            </p>
          </div>
        ) : (
          <div
            className="relative my-auto w-full shrink-0"
            style={
              {
                height: layout ? layout.height : 0,
                '--u': u > 0 ? `${u}px` : 'clamp(19px, 4.6vw, 34px)',
              } as React.CSSProperties
            }
          >
            {selection?.fitsLeft && layout?.nextLeft && u > 0 && (
              <EndZone
                end="left"
                value={board[0].left}
                slot={layout.nextLeft}
                u={u}
                onClick={() => onChooseEnd('left')}
              />
            )}
            <AnimatePresence initial={false}>
              {layout &&
                u > 0 &&
                board.map((t) => {
                  const s = layout.slots.get(t.id)
                  if (!s) return null
                  const w = s.vertical ? u : 2 * u
                  const h = s.vertical ? 2 * u : u
                  return (
                    <motion.div
                      key={t.id}
                      data-tile-id={t.id}
                      className={cn('absolute left-0 top-0 will-change-transform', s.corner ? 'z-[3]' : 'z-[2]')}
                      initial={{ opacity: 0, scale: 1.45, rotate: -8, x: s.cx - w / 2, y: s.cy - h / 2 - 18 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0, x: s.cx - w / 2, y: s.cy - h / 2 }}
                      exit={{ opacity: 0, scale: 0.55, transition: { duration: 0.18 } }}
                      transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                    >
                      <div style={{ transform: s.flip ? 'scaleX(-1)' : undefined }}>
                        <DominoTile
                          left={t.left}
                          right={t.right}
                          vertical={s.vertical}
                          highlight={t.id === lastPlacedId}
                        />
                      </div>
                    </motion.div>
                  )
                })}
            </AnimatePresence>
            {selection?.fitsRight && layout?.nextRight && u > 0 && (
              <EndZone
                end="right"
                value={board[board.length - 1].right}
                slot={layout.nextRight}
                u={u}
                onClick={() => onChooseEnd('right')}
              />
            )}
          </div>
        )}

        {/* Overlay de reparto */}
        <AnimatePresence>
          {phase === 'dealing' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 rounded-xl bg-[#0b3d26]/70 backdrop-blur-[2px]"
            >
              <div className="flex items-end gap-1.5" aria-hidden="true">
                <motion.span
                  animate={{ rotate: [-7, 7, -7], y: [0, -6, 0] }}
                  transition={{ repeat: Infinity, duration: 0.7 }}
                >
                  <TileBack className="h-9 w-5 sm:h-12 sm:w-7" />
                </motion.span>
                <motion.span
                  animate={{ rotate: [6, -6, 6], y: [0, -9, 0] }}
                  transition={{ repeat: Infinity, duration: 0.55 }}
                >
                  <TileBack className="h-9 w-5 sm:h-12 sm:w-7" />
                </motion.span>
                <motion.span
                  animate={{ rotate: [-5, 5, -5], y: [0, -5, 0] }}
                  transition={{ repeat: Infinity, duration: 0.8 }}
                >
                  <TileBack className="h-9 w-5 sm:h-12 sm:w-7" />
                </motion.span>
              </div>
              <p className="text-sm font-semibold tracking-wide text-emerald-50">Barajando y repartiendo…</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}

function EndZone({
  end,
  value,
  slot,
  u,
  onClick,
}: {
  end: End
  value: number
  slot: Slot
  u: number
  onClick: () => void
}) {
  const w = slot.vertical ? u : 2 * u
  const h = slot.vertical ? 2 * u : u
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, scale: 0.6, x: slot.cx - w / 2, y: slot.cy - h / 2 }}
      animate={{ opacity: 1, x: slot.cx - w / 2, y: slot.cy - h / 2, scale: [1, 1.05, 1] }}
      exit={{ opacity: 0, scale: 0.6, transition: { duration: 0.15 } }}
      transition={{
        scale: { repeat: Infinity, duration: 1.4 },
        default: { type: 'spring', stiffness: 320, damping: 26 },
      }}
      onClick={onClick}
      aria-label={`Colocar ficha en el extremo ${end === 'left' ? 'izquierdo' : 'derecho'} (necesita ${value})`}
      className="absolute left-0 top-0 z-[4] flex cursor-pointer items-center justify-center rounded-[8px] border-2 border-dashed border-amber-300/80 bg-amber-300/15 shadow-[0_0_14px_rgba(251,191,36,0.35)]"
      style={{ width: w, height: h }}
    >
      {slot.vertical ? (
        <NumberBadge value={value} className="h-5 w-5 text-[11px]" />
      ) : (
        <>
          {end === 'left' ? (
            <ChevronLeft className="h-4 w-4 text-amber-100" aria-hidden="true" />
          ) : (
            <ChevronRight className="h-4 w-4 text-amber-100" aria-hidden="true" />
          )}
          <NumberBadge value={value} />
        </>
      )}
    </motion.button>
  )
}
