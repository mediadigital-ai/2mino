/**
 * Test geométrico del layout serpiente — ESQUINAS PEGADAS Y SIN HUECOS.
 *
 * Recorre los brazos igual que el algoritmo (el izquierdo invierte el orden
 * de la cadena) y verifica:
 *  A. La ficha de giro está SIEMPRE pegada al borde físico (x0≈0 o x1≈W).
 *  B. Fila tensada (la que dobla): TODOS sus huecos son IGUALES =
 *     GAP + sobrante/n — reparto uniforme hasta la esquina.
 *  C. Fila compacta (última del brazo, sin giro): todos los huecos = GAP.
 *  D. La fila que sigue a un giro arranca PEGADA a su otra mitad: hueco
 *     giro↔primera ficha = GAP exacto y ninguna ficha invade [borde, borde+u).
 *  E. Sin solapes en ninguna fila (global, ambas bandas).
 *  F. Continuidad de valores renderizados en cada contacto (flip, dobles,
 *     giros; el giro muestra left arriba y right abajo).
 *  G. Ancla centrada y huecos ancla↔brazo = GAP.
 */
import { layoutSnake } from '../src/components/domino/snake-layout'
import type { BoardTile } from '../src/lib/domino/types'

const TOL = 0.7
const GAP = 2

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Cadena válida: board[i].right === board[i+1].left. */
function chain(n: number, r: () => number): BoardTile[] {
  const tiles: BoardTile[] = []
  let v = Math.floor(r() * 7)
  for (let i = 0; i < n; i++) {
    const w = Math.floor(r() * 7)
    tiles.push({ id: `t${i}`, left: v, right: w, isDouble: v === w })
    v = w
  }
  return tiles
}

interface Fail { case: string; msg: string }
const failures: Fail[] = []
let cornersChecked = 0
let stretchedRows = 0
let entryFlushChecks = 0
let dumped = 0

interface It {
  id: string
  t: BoardTile
  s: ReturnType<ReturnType<typeof layoutSnake>['slots']['get']> & NonNullable<unknown>
  x0: number
  x1: number
  cx: number
  cy: number
  vertical: boolean
  flip: boolean
  corner: boolean
}

function checkCase(
  name: string,
  tiles: BoardTile[],
  W: number,
  u: number,
  anchorId: string | null,
  full: boolean
) {
  const lay = layoutSnake(tiles, W, u, anchorId)
  const fail = (msg: string) => failures.push({ case: name, msg })

  if (lay.slots.size !== tiles.length) return fail(`slots ${lay.slots.size} != tiles ${tiles.length}`)

  const idxOf = new Map<string, number>()
  tiles.forEach((t, i) => idxOf.set(t.id, i))

  // ancla (con el mismo fallback que layoutSnake)
  let anchorIdx = anchorId ? tiles.findIndex((t) => t.id === anchorId) : -1
  if (anchorIdx < 0) anchorIdx = Math.floor((tiles.length - 1) / 2)
  const anchor = tiles[anchorIdx]
  const anchorSlot = lay.slots.get(anchor.id)!
  const shift = anchorSlot.cy

  const wOf = (id: string): number => {
    const s = lay.slots.get(id)!
    return s.vertical ? u : tiles[idxOf.get(id)!].isDouble ? u : 2 * u
  }
  const it = (id: string): It => {
    const s = lay.slots.get(id)!
    const w = wOf(id)
    return { id, t: tiles[idxOf.get(id)!], s, x0: s.cx - w / 2, x1: s.cx + w / 2, cx: s.cx, cy: s.cy, vertical: s.vertical, flip: s.flip, corner: s.corner }
  }

  // ── G. Ancla centrada ──
  if (Math.abs(anchorSlot.cx - W / 2) > 0.6) fail(`ancla descentrada (${(anchorSlot.cx - W / 2).toFixed(1)})`)

  // ── Segmentos por brazo (el orden de COLOCACIÓN es el del algoritmo) ──
  const rightArm = tiles.slice(anchorIdx + 1) // se aleja del ancla hacia la derecha
  const leftArm = tiles.slice(0, anchorIdx).reverse() // se aleja hacia la izquierda

  const segsOf = (arm: BoardTile[]): { tiles: It[]; corner: It | null }[] => {
    const segs: { tiles: It[]; corner: It | null }[] = []
    let cur: { tiles: It[]; corner: It | null } = { tiles: [], corner: null }
    for (const t of arm) {
      const s = lay.slots.get(t.id)!
      if (s.corner) {
        cur.corner = it(t.id)
        segs.push(cur)
        cur = { tiles: [], corner: null }
      } else {
        cur.tiles.push(it(t.id))
      }
    }
    if (cur.tiles.length > 0 || cur.corner) segs.push(cur)
    return segs
  }

  const allSegs = [...segsOf(rightArm), ...segsOf(leftArm)]

  for (const seg of allSegs) {
    const items = [...seg.tiles, ...(seg.corner ? [seg.corner] : [])].sort((a, b) => a.x0 - b.x0)

    // A. giro pegado al borde
    if (seg.corner) {
      cornersChecked++
      const flush = Math.min(seg.corner.x0, W - seg.corner.x1)
      if (flush > TOL) fail(`giro NO pegado al borde (${flush.toFixed(1)}px)`)
    }
    if (!full) continue

    // E. sin solapes dentro del segmento
    const gaps: number[] = []
    for (let i = 1; i < items.length; i++) gaps.push(items[i].x0 - items[i - 1].x1)
    for (const g of gaps) if (g < -TOL) fail(`SOLAPE en segmento (${g.toFixed(1)}px)`)

    if (seg.tiles.length === 0) continue

    if (seg.corner) {
      // B. tensado uniforme
      const cornerLeft = seg.corner.x0 < W / 2
      const sumW = seg.tiles.reduce((s, i2) => s + (i2.x1 - i2.x0), 0)
      const n = seg.tiles.length
      const startEdge = cornerLeft
        ? Math.max(...seg.tiles.map((i2) => i2.x1))
        : Math.min(...seg.tiles.map((i2) => i2.x0))
      const avail = cornerLeft ? startEdge - u : W - u - startEdge
      const leftover = avail - sumW - n * GAP
      const expected = GAP + Math.max(0, leftover) / n
      for (const g of gaps) {
        if (Math.abs(g - expected) > TOL) {
          fail(`tensado NO uniforme (hueco=${g.toFixed(1)} vs esperado=${expected.toFixed(1)})`)
        }
      }
      if (expected > GAP + TOL) stretchedRows++
    } else {
      // C. compacta
      for (const g of gaps) {
        if (Math.abs(g - GAP) > TOL) fail(`fila compacta con hueco ${g.toFixed(1)} != ${GAP}`)
      }
    }
  }

  if (!full) return

  // G. hueco ancla↔primera ficha de cada brazo = GAP
  for (const arm of [rightArm, leftArm]) {
    if (arm.length === 0) continue
    const first = it(arm[0].id)
    const gap = Math.abs(first.cx - anchorSlot.cx) - wOf(first.id) / 2 - wOf(anchor.id) / 2
    if (Math.abs(gap - GAP) > TOL) fail(`hueco ancla↔${first.id} = ${gap.toFixed(1)} != ${GAP}`)
  }

  // E2. sin solapes global por banda visual (agrupando con shift)
  const groups = new Map<number, It[]>()
  for (const t of tiles) {
    const s = lay.slots.get(t.id)!
    const key = Math.round((s.cy - shift) / (2 * u))
    const arr = groups.get(key) ?? []
    arr.push(it(t.id))
    groups.set(key, arr)
  }
  for (const [, arr] of groups) {
    const sorted = arr.sort((a, b) => a.x0 - b.x0)
    for (let i = 1; i < sorted.length; i++) {
      const g = sorted[i].x0 - sorted[i - 1].x1
      if (g < -TOL) fail(`SOLAPE global (${g.toFixed(1)}px)`)
    }
  }

  // D. franja del giro reservada en sus dos bandas físicas
  for (const t of tiles) {
    const s = lay.slots.get(t.id)!
    if (!s.corner) continue
    const c = it(t.id)
    const cornerLeft = c.x0 < W / 2
    for (const band of [Math.round((s.cy - u - shift) / (2 * u)), Math.round((s.cy + u - shift) / (2 * u))]) {
      const bandCy = shift + band * 2 * u
      for (const t2 of tiles) {
        const s2 = lay.slots.get(t2.id)!
        if (t2.id === t.id || s2.corner) continue
        if (Math.abs(s2.cy - bandCy) > 0.5) continue // solo fichas centradas en esa banda
        const w = wOf(t2.id)
        const x0 = s2.cx - w / 2
        const x1 = s2.cx + w / 2
        const dist = cornerLeft ? x0 : W - x1
        if (dist < u + GAP - TOL) {
          fail(`ficha ${t2.id} invade franja del giro ${t.id} (dist=${dist.toFixed(1)})`)
        }
      }
    }
    // D2. la primera ficha de la fila de entrada está PEGADA al giro (hueco GAP)
    //     y a distancia u+GAP del borde
    const entryId = segsOf(rightArm).concat(segsOf(leftArm)).length >= 0 ? null : null
    void entryId
  }

  // D2. hueco giro↔primera ficha de la fila de entrada = GAP (por brazo)
  for (const arm of [rightArm, leftArm]) {
    const segs = segsOf(arm)
    for (let si = 0; si < segs.length - 1; si++) {
      const corner = segs[si].corner
      const next = segs[si + 1]
      if (!corner || next.tiles.length === 0) continue
      entryFlushChecks++
      const cornerLeft = corner.x0 < W / 2
      const first = next.tiles.reduce((a, b) => (cornerLeft ? (b.x0 < a.x0 ? b : a) : b.x1 > a.x1 ? b : a))
      const gapEntry = cornerLeft ? first.x0 - corner.x1 : corner.x0 - first.x1
      if (Math.abs(gapEntry - GAP) > TOL) {
        fail(`fila de entrada NO pegada al giro ${corner.id}→${first.id} (hueco=${gapEntry.toFixed(1)})`)
      }
      const dist = cornerLeft ? first.x0 : W - first.x1
      if (Math.abs(dist - (u + GAP)) > TOL) {
        fail(`primera ficha de fila de entrada no está a u+GAP del borde (${dist.toFixed(1)})`)
      }
    }
  }

  // F. continuidad de valores en cada contacto
  const valOf = (t: BoardTile, id: string, side: 'L' | 'R', otherCy: number): number => {
    const s = lay.slots.get(id)!
    if (s.corner) return otherCy < s.cy ? t.left : t.right // giro: arriba=left
    if (s.vertical) return t.left // doble perpendicular
    return side === 'L' ? (s.flip ? t.right : t.left) : s.flip ? t.left : t.right
  }

  for (let i = 0; i < tiles.length - 1; i++) {
    const a = tiles[i]
    const b = tiles[i + 1]
    const sa = lay.slots.get(a.id)!
    const sb = lay.slots.get(b.id)!
    const wa = wOf(a.id)
    const wb = wOf(b.id)
    const dx = sb.cx - sa.cx
    const dy = Math.abs(sb.cy - sa.cy)

    if (dy < u) {
      const gap = Math.abs(dx) - wa / 2 - wb / 2
      if (gap < -TOL) fail(`cadena ${a.id}→${b.id}: SOLAPE`)
      const aSide = dx > 0 ? 'R' : 'L'
      const bSide = dx > 0 ? 'L' : 'R'
      const va = valOf(a, a.id, aSide, sb.cy)
      const vb = valOf(b, b.id, bSide, sa.cy)
      if (va !== vb) {
        fail(`valores ${a.id}(${va}) vs ${b.id}(${vb}) en contacto`)
        if (dumped < 4) {
          dumped++
          console.log(`\n── DUMP ${name} ──`)
          console.log(` cadena: ${tiles.map((t) => `[${t.left}|${t.right}]${t.isDouble ? 'D' : ''}`).join(' ')}`)
          for (const t of tiles) {
            const s = lay.slots.get(t.id)!
            console.log(
              `  ${t.id} [${t.left}|${t.right}] cx=${s.cx.toFixed(1)} cy=${s.cy.toFixed(1)} ${s.vertical ? 'VERT' : 'horiz'}${s.corner ? ' GIRO' : ''}${s.flip ? ' FLIP' : ''}`
            )
          }
        }
      }
    } else {
      // cruce de fila: exactamente uno de los dos es giro
      if (sa.corner === sb.corner) {
        fail(`cadena ${a.id}→${b.id}: salto de fila sin giro`)
        continue
      }
      const cornerId = sa.corner ? a.id : b.id
      const otherId = sa.corner ? b.id : a.id
      const cornerIdx = idxOf.get(cornerId)!
      const otherIdx = idxOf.get(otherId)!
      // lado de entrada del giro: en el brazo derecho es board[c+1]; en el
      // izquierdo (orden invertido) es board[c-1]
      const isEntrySide =
        cornerIdx >= anchorIdx ? otherIdx === cornerIdx + 1 : otherIdx === cornerIdx - 1
      const corner = it(cornerId)
      const other = it(otherId)
      const cornerLeft = corner.x0 < W / 2
      if (isEntrySide) {
        // pegado al giro: hueco GAP y a u+GAP del borde
        const gapEntry = cornerLeft ? other.x0 - corner.x1 : corner.x0 - other.x1
        if (Math.abs(gapEntry - GAP) > TOL) {
          fail(`giro ${cornerId}→${otherId}: entrada con hueco ${gapEntry.toFixed(1)} != ${GAP}`)
        }
      }
      const va = valOf(a, a.id, dx > 0 ? 'R' : 'L', sb.cy)
      const vb = valOf(b, b.id, dx > 0 ? 'L' : 'R', sa.cy)
      if (va !== vb) fail(`valores cruce ${a.id}(${va}) vs ${b.id}(${vb})`)
    }
  }

  if (tiles.length > 0 && (!lay.nextLeft || !lay.nextRight)) fail('faltan zonas nextLeft/nextRight')
}

function main() {
  const r1 = rng(20260930)
  let trials = 0

  // ── Pasada realista (invariantes completos): fieltro 12u..32u ──
  for (let trial = 0; trial < 2000; trial++) {
    const u = 19 + Math.floor(r1() * 16)
    const W = Math.round((12 + r1() * 20) * u)
    const n = 1 + Math.floor(r1() * 27)
    const tiles = chain(n, r1)
    const anchorId = tiles[Math.floor(r1() * n)].id
    checkCase(`real#${trial} n=${n} W=${W} u=${u} a=${anchorId}`, tiles, W, u, anchorId, true)
    trials++
  }

  // ── Cadenas de 28 (máximo) con combinaciones fijas ──
  for (const W of [340, 390, 480, 600, 780, 980, 1200, 1400]) {
    for (const u of [19, 22, 26, 30, 34]) {
      const tiles = chain(28, rng(W * 131 + u))
      checkCase(`long28 W=${W} u=${u}`, tiles, W, u, tiles[14].id, true)
      trials++
    }
  }

  // ── Ancla doble y normal ──
  for (let trial = 0; trial < 400; trial++) {
    const u = 19 + Math.floor(r1() * 12)
    const W = Math.round((12 + r1() * 14) * u)
    const n = 2 + Math.floor(r1() * 10)
    const tiles = chain(n, r1)
    const ai = Math.floor(r1() * n)
    if (r1() < 0.5 && !tiles[ai].isDouble) {
      tiles[ai] = { ...tiles[ai], right: tiles[ai].left, isDouble: true }
      if (ai + 1 < n) {
        const nx = tiles[ai + 1]
        const newLeft = tiles[ai].left
        tiles[ai + 1] = { ...nx, left: newLeft, isDouble: newLeft === nx.right }
      }
    }
    checkCase(`anchor#${trial} W=${W} u=${u} n=${n}`, tiles, W, u, tiles[ai].id, true)
    trials++
  }

  // ── Pasada degenerada (4u..12u): solo no-crash, sin solapes, giro pegado ──
  for (let trial = 0; trial < 400; trial++) {
    const u = 19 + Math.floor(r1() * 16)
    const W = Math.round((4 + r1() * 8) * u)
    const n = 1 + Math.floor(r1() * 27)
    const tiles = chain(n, r1)
    checkCase(`deg#${trial} W=${W} u=${u} n=${n}`, tiles, W, u, tiles[Math.floor(r1() * n)].id, false)
    trials++
  }

  console.log(
    `Casos: ${trials} · giros: ${cornersChecked} · filas tensadas: ${stretchedRows} · entradas pegadas al giro: ${entryFlushChecks}`
  )
  if (failures.length > 0) {
    console.log(`\n❌ ${failures.length} FALLOS:`)
    const seen = new Set<string>()
    for (const f of failures) {
      const key = f.msg.replace(/[\d.]+/g, '#')
      if (seen.has(key)) continue
      seen.add(key)
      console.log(`  [${f.case}] ${f.msg}`)
      if (seen.size > 20) break
    }
    process.exit(1)
  } else {
    console.log('✅ INVARIANTES OK: giros pegados al borde, tensado uniforme, filas compactas,')
    console.log('   entrada pegada al giro (hueco GAP), sin solapes, valores consistentes, ancla centrada.')
  }
}

main()
