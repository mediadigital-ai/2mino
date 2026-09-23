'use client'

/**
 * Pantalla de menú: configuración de la partida sobre fondo de fieltro.
 */
import { motion } from 'framer-motion'
import { BookOpen, Play, Trophy, Users, Volume2 } from 'lucide-react'
import { aiDescription } from '@/lib/domino/ai'
import { type Difficulty, type Settings } from '@/lib/domino/types'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { DominoTile } from './domino-tile'

export interface MenuStats {
  played: number
  wins: number
}

interface MenuScreenProps {
  settings: Settings
  stats: MenuStats | null
  onChange: (patch: Partial<Settings>) => void
  onStart: (settings: Settings) => void
  onOpenRules: () => void
}

const PLAYER_OPTIONS: { value: 2 | 3 | 4; hint: string }[] = [
  { value: 2, hint: '1 rival' },
  { value: 3, hint: '2 rivales' },
  { value: 4, hint: '3 rivales' },
]

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: 'facil', label: 'Fácil' },
  { value: 'normal', label: 'Normal' },
  { value: 'dificil', label: 'Difícil' },
]

const TARGET_OPTIONS: (100 | 150 | 200)[] = [100, 150, 200]

export function MenuScreen({ settings, stats, onChange, onStart, onOpenRules }: MenuScreenProps) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_20%,#1d6b45_0%,#135234_45%,#09301e_100%)] p-4">
      {/* Fichas decorativas */}
      <motion.div aria-hidden="true" className="pointer-events-none absolute left-[8%] top-[16%] hidden -rotate-[18deg] opacity-25 sm:block" animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 5 }}>
        <DominoTile left={6} right={4} vertical />
      </motion.div>
      <motion.div aria-hidden="true" className="pointer-events-none absolute right-[10%] top-[24%] hidden rotate-[24deg] opacity-25 sm:block" animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 6 }}>
        <DominoTile left={2} right={5} />
      </motion.div>
      <motion.div aria-hidden="true" className="pointer-events-none absolute bottom-[12%] left-[16%] hidden rotate-[10deg] opacity-20 sm:block" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 7 }}>
        <DominoTile left={3} right={3} vertical />
      </motion.div>
      <motion.div aria-hidden="true" className="pointer-events-none absolute bottom-[18%] right-[14%] hidden -rotate-[14deg] opacity-20 sm:block" animate={{ y: [0, 12, 0] }} transition={{ repeat: Infinity, duration: 5.5 }}>
        <DominoTile left={0} right={6} />
      </motion.div>

      <div style={{ '--u': 'clamp(26px, 5vw, 40px)' } as React.CSSProperties} className="relative z-10 w-full max-w-lg">
        {/* Título */}
        <header className="mb-6 text-center">
          <div className="mb-3 flex items-end justify-center gap-1.5" aria-hidden="true">
            <motion.span
              initial={{ rotate: -12, y: -20, opacity: 0 }}
              animate={{ rotate: -10, y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            >
              <DominoTile left={6} right={6} vertical />
            </motion.span>
            <motion.span
              initial={{ rotate: 10, y: -26, opacity: 0 }}
              animate={{ rotate: 8, y: -6, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.12 }}
            >
              <DominoTile left={5} right={2} />
            </motion.span>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-[#fdf6e3] drop-shadow-[0_3px_6px_rgba(0,0,0,0.5)] sm:text-5xl">
            Dominó <span className="text-amber-300">Clásico</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-emerald-100/80">
            El juego de mesa de siempre — ahora contra la CPU
          </p>
        </header>

        {/* Tarjeta de configuración */}
        <div className="rounded-2xl border border-[#0d3320] bg-[#f4efdd]/97 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] sm:p-6">
          <OptionGroup
            label="Jugadores"
            icon={<Users className="h-4 w-4" aria-hidden="true" />}
            hint={settings.numPlayers === 2 ? '7 fichas cada uno' : settings.numPlayers === 3 ? '7 fichas cada uno' : '6 fichas cada uno'}
          >
            {PLAYER_OPTIONS.map((opt) => (
              <OptionChip
                key={opt.value}
                active={settings.numPlayers === opt.value}
                onClick={() => onChange({ numPlayers: opt.value })}
              >
                {opt.value}
              </OptionChip>
            ))}
          </OptionGroup>

          <OptionGroup
            label="Dificultad de la CPU"
            icon={<Trophy className="h-4 w-4" aria-hidden="true" />}
            hint={aiDescription(settings.difficulty)}
          >
            {DIFFICULTY_OPTIONS.map((opt) => (
              <OptionChip
                key={opt.value}
                active={settings.difficulty === opt.value}
                onClick={() => onChange({ difficulty: opt.value })}
              >
                {opt.label}
              </OptionChip>
            ))}
          </OptionGroup>

          <OptionGroup label="Meta de puntos" icon={<Trophy className="h-4 w-4" aria-hidden="true" />}>
            {TARGET_OPTIONS.map((value) => (
              <OptionChip key={value} active={settings.targetScore === value} onClick={() => onChange({ targetScore: value })}>
                {value}
              </OptionChip>
            ))}
          </OptionGroup>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-[#d8cfae] bg-[#fbf8ec] px-4 py-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#3a3325]">
              <Volume2 className="h-4 w-4 text-[#8a6d2f]" aria-hidden="true" />
              Sonidos de mesa
            </div>
            <Switch
              checked={settings.sound}
              onCheckedChange={(v) => onChange({ sound: v })}
              aria-label="Activar o desactivar sonidos"
            />
          </div>

          <Button
            size="lg"
            className="mt-5 h-12 w-full rounded-xl bg-gradient-to-b from-amber-400 to-amber-600 text-base font-black tracking-wide text-[#241a02] shadow-[0_6px_16px_rgba(180,130,20,0.45)] hover:from-amber-300 hover:to-amber-500"
            onClick={() => onStart(settings)}
          >
            <Play className="mr-1.5 h-5 w-5" aria-hidden="true" />
            Comenzar partida
          </Button>

          <div className="mt-3 flex items-center justify-between">
            <Button variant="ghost" size="sm" className="text-[#6b5e3c] hover:text-[#3a3325]" onClick={onOpenRules}>
              <BookOpen className="mr-1 h-4 w-4" aria-hidden="true" />
              Cómo se juega
            </Button>
            {stats && stats.played > 0 && (
              <p className="text-xs font-semibold text-[#8a7c58]">
                {stats.played} partidas · {stats.wins} victorias
              </p>
            )}
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-emerald-100/50">
          Reglas clásicas de robar · set de doble seis (28 fichas)
        </p>
      </div>
    </div>
  )
}

function OptionGroup({
  label,
  hint,
  icon,
  children,
}: {
  label: string
  hint?: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="mt-4 first:mt-0">
      <div className="mb-2 flex items-baseline gap-2">
        <p className="flex items-center gap-1.5 text-sm font-bold text-[#3a3325]">
          {icon}
          {label}
        </p>
        {hint && <p className="truncate text-[11px] font-medium text-[#8a7c58]">{hint}</p>}
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

function OptionChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'min-w-[64px] flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500',
        active
          ? 'border-amber-600 bg-gradient-to-b from-amber-300 to-amber-400 text-[#241a02] shadow-[0_3px_8px_rgba(180,130,20,0.4)]'
          : 'border-[#d8cfae] bg-[#fbf8ec] text-[#6b5e3c] hover:border-amber-400 hover:text-[#3a3325]'
      )}
    >
      {children}
    </button>
  )
}
