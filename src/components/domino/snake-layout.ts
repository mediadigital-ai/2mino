/**
 * Layout "serpiente" BILATERAL del tablero de dominó (como en la mesa real).
 *
 * La ficha de APERTURA (ancla) se planta en el CENTRO exacto de la mesa y la
 * cadena crece en ambos sentidos desde ella:
 *  - Brazo DERECHO (board[ancla..n-1]): crece hacia la derecha en la fila
 *    central; al llegar al borde dobla hacia ABAJO (fila 1, 2, 3…).
 *  - Brazo IZQUIERDO (board[0..ancla] recorrido al revés): crece hacia la
 *    izquierda en la fila central; al llegar al borde dobla hacia ARRIBA
 *    (fila -1, -2…).
 *  - Al ocupar cada brazo franjas de filas DISJUNTAS (uno baja, el otro sube)
 *    jamás se cruzan: no hay colisiones ni huecos de frontera.
 *
 * GIROS PEGADOS A LA ESQUINA:
 *  - La ficha de giro (perpendicular) se planta SIEMPRE pegada al borde físico
 *    de la mesa (x=0 o x=W-u), nunca donde el cursor se quedó sin espacio.
 *  - La fila que dobla se TENSA: el sobrante (lo que sobró antes del borde)
 *    se reparte de forma UNIFORME entre todos sus huecos (entre fichas y el
 *    hueco previo al giro), de modo que la cadena llega hasta la esquina sin
 *    dejar fieltro vacío. La mitad de la ficha de giro llena en cada fila el
 *    hueco de media ficha horizontal junto al borde.
 *  - Las filas que NO doblan (fin del brazo) quedan compactas (gap GAP).
 *
 * Geometría:
 *  - u: unidad de ficha. Horizontal: 2u × u · Vertical (dobles y giros): u × 2u.
 *  - Fila k: centro vertical y = shift + k·2u. Una ficha de fieltro entre filas;
 *    los dobles (perpendiculares) y los giros nunca rozan la fila contigua.
 *  - Giro: vertical, centrado entre dos filas; arriba muestra `left` y abajo
 *    `right` (igual en ambos brazos, porque el giro del brazo izquierdo deja
 *    la fila que abandona en su mitad INFERIOR).
 *
 * Orientación de los valores: la cadena respeta board[i].right === board[i+1].left
 * en pantalla. Regla general por brazo: las filas que avanzan en el sentido
 * inicial del brazo van sin espejo; las filas de vuelta van espejadas (scaleX).
 *
 * Zonas de colocación (nextLeft / nextRight): se calculan tendiendo el brazo
 * correspondiente con una ficha virtual añadida al extremo, de modo que la
 * zona aparece EXACTAMENTE donde aterrizará la ficha al jugarla.
 */
import type { BoardTile } from '@/lib/domino/types'

export interface Slot {
  /** centro x en px dentro del contenedor */
  cx: number
  /** centro y en px dentro del contenedor */
  cy: number
  /** ficha girada (giro de esquina o doble perpendicular) */
  vertical: boolean
  /**
   * Espejo: en fichas horizontales invierte izquierda/derecha (fila de vuelta).
   * Los giros verticales siempre muestran left arriba, right abajo (flip=false).
   */
  flip: boolean
  /** es una ficha de giro entre dos filas */
  corner: boolean
}

export interface SnakeLayout {
  slots: Map<string, Slot>
  /** altura necesaria del contenedor de la cadena */
  height: number
  /** posición del siguiente hueco en el extremo izquierdo (zona de colocación) */
  nextLeft: Slot | null
  /** posición del siguiente hueco en el extremo derecho (zona de colocación) */
  nextRight: Slot | null
}

const GAP = 2

/** Segmento de fila: fichas tendidas en la fila k + giro de esquina opcional. */
interface Seg {
  k: number
  dir: 1 | -1
  tiles: BoardTile[]
  corner: BoardTile | null
}

interface ArmPlan {
  segs: Seg[]
  minRow: number
  maxRow: number
}

interface ArmOptions {
  /** borde de la primera ficha: para dir=1 su borde IZQUIERDO; para dir=-1 su borde DERECHO */
  cursor: number
  /** sentido inicial del brazo en la fila central */
  startDir: 1 | -1
  /** centro y de la fila central (fila 0 del brazo) */
  cy0: number
  /** +1: las filas del brazo avanzan hacia abajo · -1: hacia arriba */
  rowStep: 1 | -1
}

const tileW = (t: BoardTile, u: number): number => (t.isDouble ? u : 2 * u)

/**
 * FASE A — reparte las fichas del brazo (en orden desde el ancla) en segmentos
 * de fila, decidiendo dónde dobla la cadena. Mientras queden fichas en el
 * brazo, cada fila reserva u + GAP al final para que el giro quepa pegado.
 */
function planArm(tiles: BoardTile[], W: number, u: number, opts: ArmOptions): ArmPlan {
  const segs: Seg[] = []
  let minRow = 0
  let maxRow = 0
  if (tiles.length === 0 || W < 2 * u) return { segs, minRow, maxRow }

  let k = 0
  let dir: 1 | -1 = opts.startDir
  let cursor = opts.cursor
  let seg: Seg = { k, dir, tiles: [], corner: null }

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]
    const w = tileW(t, u)
    const reserve = i < tiles.length - 1 ? u + GAP : 0
    const fits = dir === 1 ? cursor + w + reserve <= W : cursor - w - reserve >= 0

    if (fits) {
      seg.tiles.push(t)
      cursor += dir === 1 ? w + GAP : -(w + GAP)
    } else {
      // Giro de esquina: la ficha se planta PERPENDICULAR pegada al borde.
      seg.corner = t
      segs.push(seg)
      const kNext = k + opts.rowStep
      maxRow = Math.max(maxRow, k, kNext)
      minRow = Math.min(minRow, k, kNext)
      k = kNext
      dir = dir === 1 ? -1 : 1
      // La siguiente fila arranca pegada a la mitad del giro que queda en ella.
      cursor = dir === 1 ? u + GAP : W - u - GAP
      seg = { k, dir, tiles: [], corner: null }
    }
  }
  if (seg.tiles.length > 0) segs.push(seg)
  return { segs, minRow, maxRow }
}

/**
 * FASE B — posiciona los segmentos. Las filas que doblan se TENSAN: el
 * sobrante hasta el borde se reparte de forma uniforme entre todos los huecos
 * de la fila (entre fichas y el hueco previo al giro), de modo que el giro
 * queda PEGADO al borde y no queda fieltro vacío.
 */
function placeArm(
  segs: Seg[],
  W: number,
  u: number,
  opts: ArmOptions,
  cyOf: (k: number) => number
): Map<string, Slot> {
  const slots = new Map<string, Slot>()
  let first = true

  for (const seg of segs) {
    const dir = seg.dir
    // Arranque del segmento: el primero usa el cursor inicial del brazo; los
    // siguientes salen pegados a la mitad del giro anterior (en el borde).
    let cursor: number
    if (first) {
      cursor = opts.cursor
      first = false
    } else {
      cursor = dir === 1 ? u + GAP : W - u - GAP
    }

    const n = seg.tiles.length
    let gap = GAP
    if (seg.corner && n > 0) {
      // Espacio disponible para las fichas de la fila (el giro ocupa la
      // última u pegada al borde). Sobrante repartido entre n huecos:
      // (n-1) internos + el hueco previo al giro.
      const sumW = seg.tiles.reduce((s, t) => s + tileW(t, u), 0)
      const avail = dir === 1 ? W - u - cursor : cursor - u
      const leftover = avail - sumW - n * GAP
      if (leftover > 0) gap = GAP + leftover / n
    }

    let c = cursor
    for (const t of seg.tiles) {
      const w = tileW(t, u)
      const x0 = dir === 1 ? c : c - w
      slots.set(t.id, {
        cx: x0 + w / 2,
        cy: cyOf(seg.k),
        vertical: t.isDouble,
        // Fila en el sentido inicial del brazo: sin espejo.
        // Fila de vuelta: espejada (los dobles son simétricos, no la necesitan).
        flip: dir !== opts.startDir && !t.isDouble,
        corner: false,
      })
      c = dir === 1 ? x0 + w + gap : x0 - gap
    }
    if (seg.corner) {
      // Giro PEGADO AL BORDE: su mitad en esta fila llena el hueco de media
      // ficha horizontal junto a la esquina.
      slots.set(seg.corner.id, {
        cx: dir === 1 ? W - u / 2 : u / 2,
        cy: cyOf(seg.k) + opts.rowStep * u,
        vertical: true,
        flip: false,
        corner: true,
      })
    }
  }
  return slots
}

/**
 * Divide la cadena en los dos brazos según el índice del ancla y calcula
 * las secuencias (sin incluir el ancla en el brazo izquierdo).
 */
function armSequences(board: BoardTile[], anchorIdx: number) {
  const rightSeq = board.slice(anchorIdx)
  const leftSeq = board.slice(0, anchorIdx + 1).reverse().slice(1)
  return { rightSeq, leftSeq }
}

export function layoutSnake(
  board: BoardTile[],
  W: number,
  u: number,
  anchorId?: string | null
): SnakeLayout {
  const empty: SnakeLayout = { slots: new Map(), height: 0, nextLeft: null, nextRight: null }
  if (board.length === 0 || W <= 0 || u <= 0) return empty
  if (W < u * 4) return empty

  // Ancla = ficha de apertura de la ronda. Si no se conoce (uso interno o
  // cadenas sintéticas), se toma la ficha central de la cadena.
  let anchorIdx = anchorId ? board.findIndex((t) => t.id === anchorId) : -1
  if (anchorIdx < 0) anchorIdx = Math.floor((board.length - 1) / 2)

  const anchor = board[anchorIdx]
  // Semiancho del ancla: u si es horizontal, u/2 si es doble (vertical)
  const ahw = anchor.isDouble ? u / 2 : u
  const cx = W / 2

  const { rightSeq, leftSeq } = armSequences(board, anchorIdx)

  // cy0 provisional (0); al final se desplaza todo para que la fila superior empiece en 0
  const step = 2 * u
  const cyOf = (k: number) => 0 + k * step
  // El ancla se coloca a mano, EXACTAMENTE en el centro (nunca es giro).
  // Ambos brazos excluyen el ancla y arrancan pegados a sus bordes.
  const anchorSlot: Slot = { cx, cy: 0, vertical: anchor.isDouble, flip: false, corner: false }
  const armR: ArmOptions = { cursor: cx + ahw + GAP, startDir: 1, cy0: 0, rowStep: 1 }
  const armL: ArmOptions = { cursor: cx - ahw - GAP, startDir: -1, cy0: 0, rowStep: -1 }

  const rightRest = rightSeq.slice(1)
  const planR = planArm(rightRest, W, u, armR)
  const planL = planArm(leftSeq, W, u, armL)
  const slotsR = placeArm(planR.segs, W, u, armR, cyOf)
  const slotsL = placeArm(planL.segs, W, u, armL, cyOf)

  // Zonas de colocación: tendemos cada brazo con una ficha virtual en su
  // extremo y leemos dónde aterriza. Es la posición EXACTA de destino.
  const ghostR: BoardTile = { id: '__ghost_right__', left: 0, right: 0, isDouble: false }
  const planRG = planArm([...rightRest, ghostR], W, u, armR)
  const nextRight = placeArm(planRG.segs, W, u, armR, cyOf).get(ghostR.id) ?? null

  const ghostL: BoardTile = { id: '__ghost_left__', left: 0, right: 0, isDouble: false }
  const planLG = planArm([...leftSeq, ghostL], W, u, armL)
  const nextLeft = placeArm(planLG.segs, W, u, armL, cyOf).get(ghostL.id) ?? null

  // Desplazamiento vertical: la fila más alta (podría ser negativa, brazo
  // izquierdo hacia arriba) queda con su banda empezando en y=0.
  const minRow = Math.min(0, planL.minRow, planLG.minRow)
  const maxRow = Math.max(0, planR.maxRow, planL.maxRow, planRG.maxRow, planLG.maxRow)
  const shift = u - minRow * step

  const slots = new Map<string, Slot>()
  const shiftSlot = (s: Slot): Slot => ({ ...s, cy: s.cy + shift })
  slots.set(anchor.id, shiftSlot(anchorSlot))
  for (const [id, s] of slotsR) slots.set(id, shiftSlot(s))
  for (const [id, s] of slotsL) slots.set(id, shiftSlot(s))

  const height = (maxRow - minRow + 1) * step
  return {
    slots,
    height,
    nextLeft: nextLeft ? shiftSlot(nextLeft) : null,
    nextRight: nextRight ? shiftSlot(nextRight) : null,
  }
}
