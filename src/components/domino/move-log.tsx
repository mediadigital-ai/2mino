'use client'

/**
 * Historial de jugadas (columna lateral en escritorio).
 */
import { ArrowDownToLine, Ban, Dices, History, Info } from 'lucide-react'
import type { LogEntry } from '@/lib/domino/types'
import { cn } from '@/lib/utils'

const ICONS: Record<LogEntry['kind'], React.ReactNode> = {
  play: <Dices className="h-3.5 w-3.5 text-emerald-300" aria-hidden="true" />,
  draw: <ArrowDownToLine className="h-3.5 w-3.5 text-amber-300" aria-hidden="true" />,
  pass: <Ban className="h-3.5 w-3.5 text-rose-300" aria-hidden="true" />,
  round: <History className="h-3.5 w-3.5 text-amber-200" aria-hidden="true" />,
  system: <Info className="h-3.5 w-3.5 text-stone-400" aria-hidden="true" />,
}

export function MoveLog({ log, round }: { log: LogEntry[]; round: number }) {
  const recent = [...log].reverse().slice(0, 60)
  return (
    <aside
      aria-label="Historial de jugadas"
      className="hidden w-60 shrink-0 flex-col rounded-2xl border border-[#2a332c] bg-[#141b16]/95 p-3 shadow-md lg:flex"
    >
      <div className="mb-2 flex items-center gap-1.5 border-b border-[#2a332c] pb-2 text-xs font-bold uppercase tracking-wider text-stone-400">
        <History className="h-3.5 w-3.5" aria-hidden="true" />
        Historial · Ronda {round}
      </div>
      <ol className="scrollbar-thin max-h-[50vh] flex-1 space-y-1 overflow-y-auto pr-1 text-[12px] leading-snug">
        {recent.map((entry) => (
          <li
            key={entry.id}
            className={cn(
              'flex items-start gap-1.5 rounded-md px-1.5 py-1',
              entry.kind === 'round' && 'bg-amber-400/10 font-semibold text-amber-200',
              entry.kind !== 'round' && 'text-stone-300'
            )}
          >
            <span className="mt-[2px] shrink-0">{ICONS[entry.kind]}</span>
            <span>
              {entry.player && <b className="text-stone-100">{entry.player} </b>}
              {entry.text}
            </span>
          </li>
        ))}
      </ol>
    </aside>
  )
}

/** Última acción en formato compacto (móvil). */
export function LatestAction({ log }: { log: LogEntry[] }) {
  const last = log[log.length - 1]
  if (!last) return null
  return (
    <p className="flex min-h-[18px] items-center gap-1.5 truncate text-[11px] text-stone-400" aria-live="polite">
      <span className="shrink-0">{ICONS[last.kind]}</span>
      <span className="truncate">
        {last.player && <b className="text-stone-200">{last.player} </b>}
        {last.text}
      </span>
    </p>
  )
}
