'use client'

/**
 * Puntos (pips) de media ficha en una rejilla 3×3.
 * Índices:  0 1 2
 *           3 4 5
 *           6 7 8
 */
const PIP_LAYOUT: Record<number, number[]> = {
  0: [],
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 3, 6, 2, 5, 8],
}

export function Pips({ value, tone = 'dark' }: { value: number; tone?: 'dark' | 'light' }) {
  const dots = new Set(PIP_LAYOUT[value] ?? [])
  return (
    <span
      aria-hidden="true"
      className="grid h-full w-full grid-cols-3 grid-rows-3 gap-[4%] p-[7%]"
    >
      {Array.from({ length: 9 }, (_, i) => (
        <span key={i} className="flex items-center justify-center">
          {dots.has(i) && (
            <span
              className={
                tone === 'dark'
                  ? 'rounded-full bg-[#201b16] shadow-[inset_0_-1px_1px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.28)]'
                  : 'rounded-full bg-[#f5efdc] shadow-[0_1px_1px_rgba(0,0,0,0.35)]'
              }
              style={{ width: '62%', height: '62%' }}
            />
          )}
        </span>
      ))}
    </span>
  )
}
