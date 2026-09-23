'use client'

/**
 * Panel compacto de un rival CPU: avatar, puntuación, fichas ocultas y estado de turno.
 */
import { motion } from 'framer-motion'
import { Bot, Crown } from 'lucide-react'
import type { Player } from '@/lib/domino/types'
import { cn } from '@/lib/utils'
import { TileBack } from './domino-tile'

const AVATAR_STYLES = [
  'from-emerald-500 to-emerald-700',
  'from-rose-500 to-rose-700',
  'from-amber-500 to-amber-700',
]

interface OpponentPanelProps {
  player: Player
  isCurrent: boolean
  targetScore: number
  drawnThisTurn: number
  isLeader: boolean
}

export function OpponentPanel({ player, isCurrent, targetScore, drawnThisTurn, isLeader }: OpponentPanelProps) {
  const visibleBacks = Math.min(player.hand.length, 8)
  const progress = Math.min(100, Math.round((player.score / targetScore) * 100))

  return (
    <motion.article
      layout
      aria-label={`Jugador ${player.name}`}
      className={cn(
        'relative min-w-0 flex-1 overflow-hidden rounded-xl border bg-[#141b16]/95 p-2 sm:p-2.5 shadow-md transition-shadow',
        isCurrent ? 'border-amber-300/60 shadow-[0_0_16px_rgba(251,191,36,0.25)]' : 'border-[#2a332c]'
      )}
    >
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-black text-white/95 shadow-inner',
            AVATAR_STYLES[(player.id - 1) % AVATAR_STYLES.length]
          )}
        >
          {player.name.charAt(0)}
          {isLeader && player.score > 0 && (
            <Crown className="absolute -right-1 -top-1.5 h-3.5 w-3.5 text-amber-300" aria-label="Líder" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold text-stone-100">{player.name}</p>
            <span className="inline-flex items-center gap-0.5 rounded-full bg-white/5 px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-stone-400">
              <Bot className="h-2.5 w-2.5" aria-hidden="true" />
              CPU
            </span>
          </div>
          <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-black/40">
            <motion.div
              className="h-full rounded-full bg-amber-400/80"
              animate={{ width: `${progress}%` }}
              transition={{ type: 'spring', stiffness: 120, damping: 20 }}
            />
          </div>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-black tabular-nums text-stone-100">{player.score}</p>
          <p className="text-[10px] text-stone-500">pts</p>
        </div>
      </div>

      <div className="mt-2 flex min-h-[24px] items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-[2px] overflow-hidden" aria-label={`${player.hand.length} fichas en mano`}>
          {Array.from({ length: visibleBacks }, (_, i) => (
            <TileBack key={i} />
          ))}
          {player.hand.length > 8 && (
            <span className="ml-0.5 shrink-0 text-[11px] font-bold text-stone-400">+{player.hand.length - 8}</span>
          )}
        </div>
        {isCurrent ? (
          <p className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-amber-200">
            <span className="flex gap-[3px]" aria-hidden="true">
              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0 }} className="h-1 w-1 rounded-full bg-amber-200" />
              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="h-1 w-1 rounded-full bg-amber-200" />
              <motion.span animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="h-1 w-1 rounded-full bg-amber-200" />
            </span>
            {drawnThisTurn > 0 ? 'robando…' : 'pensando…'}
          </p>
        ) : (
          player.hand.length > 0 && (
            <p className="shrink-0 text-[11px] text-stone-500">{player.hand.length}</p>
          )
        )}
      </div>
    </motion.article>
  )
}
