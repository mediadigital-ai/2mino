'use client'

/**
 * Ficha de dominó visual (marfil con puntos oscuros) y reverso para rivales.
 * El tamaño se basa en la variable CSS --u definida por el contenedor:
 *   horizontal → ancho 2u × alto u · vertical → ancho u × alto 2u
 */
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'
import { Pips } from './pips'

export interface DominoTileProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  left: number
  right: number
  vertical?: boolean
  selected?: boolean
  playable?: boolean
  dimmed?: boolean
  highlight?: boolean
  as?: 'button' | 'div'
}

export const DominoTile = forwardRef<HTMLButtonElement, DominoTileProps>(function DominoTile(
  { left, right, vertical = false, selected, playable, dimmed, highlight, className, as = 'div', ...rest },
  ref
) {
  const base = cn(
    'relative flex shrink-0 select-none rounded-[10%/5%] border border-[#b6ab8e]',
    'bg-[linear-gradient(160deg,#fffdf2_0%,#f7f1dd_45%,#e9e0c2_100%)]',
    'shadow-[0_2px_3px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.9),inset_0_-2px_3px_rgba(120,105,75,0.18)]',
    vertical ? 'flex-col' : 'flex-row',
    className
  )

  const style = vertical
    ? { width: 'var(--u)', height: 'calc(var(--u) * 2)' }
    : { width: 'calc(var(--u) * 2)', height: 'var(--u)' }

  const half = 'relative flex h-[var(--u)] w-[var(--u)] items-center justify-center'

  const content = (
    <>
      <span className={half}>
        <Pips value={left} />
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'bg-[#c4b898] shadow-[inset_1px_0_0_rgba(255,255,255,0.65)]',
          vertical ? 'h-[2px] w-[76%] my-[1px]' : 'h-[76%] w-[2px] mx-[1px]'
        )}
      />
      <span className={half}>
        <Pips value={right} />
      </span>
    </>
  )

  const state = cn(
    base,
    selected && '-translate-y-2 z-10 ring-[3px] ring-amber-300 shadow-[0_10px_18px_rgba(0,0,0,0.5)]',
    !selected && playable && 'ring-2 ring-amber-400/80 cursor-pointer hover:-translate-y-1 hover:shadow-[0_8px_14px_rgba(0,0,0,0.45)]',
    dimmed && 'opacity-45 saturate-[.6]',
    highlight && 'ring-2 ring-emerald-300/80'
  )

  if (as === 'button') {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={`Ficha ${Math.min(left, right)} y ${Math.max(left, right)}`}
        className={cn(state, 'transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300')}
        style={style}
        {...rest}
      >
        {content}
      </button>
    )
  }

  return (
    <div ref={ref as unknown as React.Ref<HTMLDivElement>} className={state} style={style} {...(rest as object)}>
      {content}
    </div>
  )
})

/** Reverso de ficha (para rivales y el montón). */
export function TileBack({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'relative inline-block shrink-0 rounded-[4px] border border-[#0d3320]',
        'bg-[linear-gradient(160deg,#2f7a52_0%,#1d5c3a_60%,#154729_100%)]',
        'shadow-[0_1px_2px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]',
        'w-[12px] h-[20px] sm:w-[19px] sm:h-[31px]',
        className
      )}
    >
      <span className="absolute left-1/2 top-1/2 h-[26%] w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#cfe7d8]/60 bg-[#0f3a24]" />
    </span>
  )
}

/** Insignia circular con el número de un extremo de la cadena. */
export function NumberBadge({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return null
  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 items-center justify-center rounded-full',
        'border border-amber-300/40 bg-[#10331f] text-[13px] font-bold text-amber-200 shadow-sm',
        className
      )}
    >
      {value}
    </span>
  )
}
