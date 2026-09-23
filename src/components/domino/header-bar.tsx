'use client'

/**
 * Cabecera de la partida: título, ronda, puntuaciones y controles.
 */
import { BookOpen, Volume2, VolumeX } from 'lucide-react'
import type { Player } from '@/lib/domino/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'

interface HeaderBarProps {
  round: number
  targetScore: number
  players: Player[]
  current: number
  soundOn: boolean
  onToggleSound: () => void
  onOpenRules: () => void
  onExit: () => void
}

export function HeaderBar({
  round,
  targetScore,
  players,
  current,
  soundOn,
  onToggleSound,
  onOpenRules,
  onExit,
}: HeaderBarProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-[#232b26] bg-[#10150f]/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-1.5 px-3 py-2">
        <h1 className="flex items-center gap-1.5 text-base font-black tracking-tight text-[#f3ecd8]">
          <span aria-hidden="true" className="flex gap-[2px]">
            <span className="inline-block h-4 w-2 rounded-[3px] border border-[#c4b898] bg-gradient-to-b from-[#fffdf2] to-[#e9e0c2]" />
            <span className="inline-block h-4 w-2 -rotate-12 rounded-[3px] border border-[#c4b898] bg-gradient-to-b from-[#fffdf2] to-[#e9e0c2]" />
          </span>
          Dominó <span className="text-amber-300">Clásico</span>
        </h1>

        <span className="rounded-full bg-white/5 px-2.5 py-0.5 text-[11px] font-bold text-stone-300">
          Ronda {round} · meta {targetScore}
        </span>

        {/* Marcador compacto */}
        <div className="order-3 flex w-full flex-wrap gap-1.5 sm:order-none sm:w-auto">
          {players.map((p) => (
            <span
              key={p.id}
              aria-label={`${p.name}: ${p.score} puntos`}
              className={cn(
                'rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums',
                current === p.id
                  ? 'bg-amber-400/20 text-amber-200 ring-1 ring-amber-300/50'
                  : 'bg-white/5 text-stone-300'
              )}
            >
              {p.name} {p.score}
            </span>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-stone-300 hover:text-amber-200"
            onClick={onToggleSound}
            aria-label={soundOn ? 'Silenciar sonidos' : 'Activar sonidos'}
          >
            {soundOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-stone-300 hover:text-amber-200"
            onClick={onOpenRules}
            aria-label="Ver reglas"
          >
            <BookOpen className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-8 border-[#2a332c] bg-transparent text-xs font-bold text-stone-300 hover:bg-white/5 hover:text-stone-100" onClick={onExit}>
            Salir
          </Button>
        </div>
      </div>
    </header>
  )
}
