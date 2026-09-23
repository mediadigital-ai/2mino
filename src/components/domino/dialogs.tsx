'use client'

/**
 * Diálogos: reglas, fin de ronda y fin de partida (con confeti).
 */
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Crown, Dices, RefreshCw, Swords, Trophy, Undo2 } from 'lucide-react'
import type { GameState } from '@/lib/domino/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { DominoTile } from './domino-tile'

// ---------------------------------------------------------------------------
// Reglas
// ---------------------------------------------------------------------------

export function RulesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto scrollbar-thin border-[#2a1808] bg-[#f4efdd] sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-black text-[#2c2618]">
            <BookOpen className="h-5 w-5 text-[#8a6d2f]" aria-hidden="true" />
            Cómo se juega al dominó clásico
          </DialogTitle>
          <DialogDescription className="text-[#6b5e3c]">
            Reglas de robar con set de doble seis (28 fichas).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm leading-relaxed text-[#3a3325]">
          <section>
            <h3 className="mb-1 font-bold text-[#2c2618]">1 · Objetivo</h3>
            <p>
              Ser el primero en alcanzar la <b>meta de puntos</b> (100, 150 o 200). En cada ronda se
              reparten las fichas y se juega hasta que alguien vacíe su mano (<b>dominó</b>) o nadie
              pueda continuar (<b>bloqueo</b>).
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-bold text-[#2c2618]">2 · Reparto y apertura</h3>
            <p>
              2 jugadores reciben 7 fichas cada uno; con 4 jugadores, 6 fichas. El resto queda en el{' '}
              <b>montón</b>. Abre la ronda quien tenga el <b>doble más alto</b> (6|6, luego 5|5…) y
              debe jugarlo; si no hay dobles, la ficha con más puntos.
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-bold text-[#2c2618]">3 · Turnos</h3>
            <p>
              En tu turno coloca una ficha cuyo número coincida con uno de los{' '}
              <b>extremos abiertos</b> de la cadena. Los dobles se colocan perpendicular, como en la
              mesa de siempre. Si no puedes jugar, <b>robas del montón</b> hasta conseguir una ficha
              válida; si el montón se vacía y sigues sin poder jugar, <b>pasas</b>.
            </p>
          </section>
          <section>
            <h3 className="mb-1 font-bold text-[#2c2618]">4 · Puntuación</h3>
            <ul className="ml-4 list-disc space-y-1">
              <li>
                <b>Dominó:</b> quien vacíe su mano suma los puntos de las fichas que queden en las
                manos de todos los rivales.
              </li>
              <li>
                <b>Bloqueo:</b> si todos pasan, gana quien tenga la mano más ligera y suma los puntos
                de las fichas de los rivales. En empate, nadie puntúa.
              </li>
              <li>Un 6|6 vale 12 puntos, un 5|3 vale 8… la suma de ambas mitades.</li>
            </ul>
          </section>
          <section>
            <h3 className="mb-1 font-bold text-[#2c2618]">5 · Consejos</h3>
            <p>
              Descarga pronto los dobles y las fichas pesadas, observa qué números evitan tus rivales
              cuando roban o pasan, y guarda variedad de números para no quedarte bloqueado.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Fin de ronda
// ---------------------------------------------------------------------------

export function RoundEndDialog({
  state,
  onNextRound,
}: {
  state: GameState
  onNextRound: () => void
}) {
  const result = state.roundResult
  if (!result) return null
  const winner = state.players.find((p) => p.id === result.winnerId)
  const iWon = result.winnerId === 0

  return (
    <Dialog open>
      <DialogContent className="border-[#2a1808] bg-[#f4efdd] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2 text-center text-xl font-black text-[#2c2618]">
            {result.type === 'domino' ? (
              <>
                <Dices className="h-6 w-6 text-[#8a6d2f]" aria-hidden="true" />
                {iWon ? '¡Dominó! Vacías tu mano' : `¡Dominó de ${result.winnerName}!`}
              </>
            ) : (
              <>
                <Swords className="h-6 w-6 text-[#8a6d2f]" aria-hidden="true" />
                {result.type === 'tie' ? 'Bloqueo con empate' : 'Partida bloqueada'}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-center text-[#6b5e3c]">
            {result.type === 'tie'
              ? 'Nadie puntúa en esta ronda.'
              : `${result.winnerName} suma ${result.points} puntos.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {result.remaining.map((r) => {
            const isWinner = r.playerId === result.winnerId
            return (
              <div
                key={r.playerId}
                className={cn(
                  'rounded-xl border px-3 py-2',
                  isWinner ? 'border-amber-400 bg-amber-100/70' : 'border-[#d8cfae] bg-[#fbf8ec]'
                )}
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-bold text-[#2c2618]">
                    {isWinner && <Crown className="h-4 w-4 text-amber-600" aria-hidden="true" />}
                    {r.name}
                  </span>
                  <span className="font-black tabular-nums text-[#8a6d2f]">{r.pips} pts en fichas</span>
                </div>
                {r.tiles.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1" style={{ '--u': '17px' } as React.CSSProperties}>
                    {r.tiles.map((t) => (
                      <DominoTile key={t.id} left={t.x} right={t.y} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="rounded-xl bg-[#2c2618] p-3 text-sm font-bold text-[#f4efdd]">
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
            {state.players.map((p) => (
              <span key={p.id} className={cn('tabular-nums', p.id === result.winnerId ? 'text-amber-300' : 'text-[#f4efdd]/80')}>
                {p.name}: {p.score}/{state.settings.targetScore}
              </span>
            ))}
          </div>
          <p className="mt-1 text-[11px] font-medium text-[#f4efdd]/60">
            {winner && winner.score >= state.settings.targetScore
              ? 'Meta alcanzada — ¡final de la partida!'
              : `Siguiente ronda: ${state.round + 1} · gana el doble más alto`}
          </p>
        </div>

        <Button
          size="lg"
          className="h-11 w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-base font-black text-[#241a02] hover:from-amber-300 hover:to-amber-500"
          onClick={onNextRound}
        >
          Siguiente ronda
          <RefreshCw className="ml-1.5 h-4 w-4" aria-hidden="true" />
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Fin de partida
// ---------------------------------------------------------------------------

export function GameEndDialog({
  state,
  onPlayAgain,
  onMenu,
}: {
  state: GameState
  onPlayAgain: () => void
  onMenu: () => void
}) {
  const winner = state.players.find((p) => p.id === state.gameWinnerId)
  const iWon = state.gameWinnerId === 0
  const sorted = useMemo(() => [...state.players].sort((a, b) => b.score - a.score), [state.players])
  const confetti = useMemo(() => {
    if (!iWon) return []
    const colors = ['#fbbf24', '#34d399', '#f87171', '#fdf6e3', '#f59e0b']
    return Array.from({ length: 56 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      delay: Math.random() * 0.9,
      duration: 2.2 + Math.random() * 1.6,
      color: colors[i % colors.length],
      rotate: Math.random() * 360,
      size: 6 + Math.random() * 6,
    }))
  }, [iWon])

  return (
    <Dialog open>
      <DialogContent className="overflow-visible border-[#2a1808] bg-[#f4efdd] sm:max-w-md">
        {/* Confeti */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-visible">
          {confetti.map((c) => (
            <motion.span
              key={c.id}
              className="absolute top-0"
              style={{ left: `${c.x}%`, width: c.size, height: c.size * 0.6, backgroundColor: c.color, borderRadius: 2 }}
              initial={{ y: -30, opacity: 0, rotate: c.rotate }}
              animate={{ y: 460, opacity: [0, 1, 1, 0], rotate: c.rotate + 540 }}
              transition={{ duration: c.duration, delay: c.delay, ease: 'easeIn' }}
            />
          ))}
        </div>

        <DialogHeader className="items-center text-center">
          <motion.div
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className={cn(
              'mx-auto mb-1 flex h-16 w-16 items-center justify-center rounded-full',
              iWon ? 'bg-gradient-to-br from-amber-300 to-amber-600' : 'bg-gradient-to-br from-stone-400 to-stone-600'
            )}
          >
            <Trophy className="h-8 w-8 text-white drop-shadow" aria-hidden="true" />
          </motion.div>
          <DialogTitle className="text-2xl font-black text-[#2c2618]">
            {iWon ? '¡Victoria!' : `${winner?.name ?? 'CPU'} gana la partida`}
          </DialogTitle>
          <DialogDescription className="text-[#6b5e3c]">
            {iWon
              ? `Alcanzaste los ${state.settings.targetScore} puntos. ¡Partida magistral!`
              : `La CPU llegó primero a ${state.settings.targetScore} puntos. ¡Revancha!`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className={cn(
                'flex items-center justify-between rounded-xl border px-3 py-2 text-sm',
                i === 0 ? 'border-amber-400 bg-amber-100/70' : 'border-[#d8cfae] bg-[#fbf8ec]'
              )}
            >
              <span className="flex items-center gap-1.5 font-bold text-[#2c2618]">
                {i === 0 && <Crown className="h-4 w-4 text-amber-600" aria-hidden="true" />}
                {p.name}
              </span>
              <span className="font-black tabular-nums text-[#8a6d2f]">{p.score} pts</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            size="lg"
            className="h-11 flex-1 rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-base font-black text-[#241a02] hover:from-amber-300 hover:to-amber-500"
            onClick={onPlayAgain}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Jugar otra vez
          </Button>
          <Button size="lg" variant="outline" className="h-11 flex-1 rounded-xl border-[#c9bd97] bg-[#fbf8ec] font-bold text-[#6b5e3c] hover:text-[#2c2618]" onClick={onMenu}>
            <Undo2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Menú
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
