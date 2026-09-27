/**
 * Layout "serpiente" BILATERAL del tablero de dominó (como en la mesa real).
 *
 * La ficha de APERTURA (ancla) se planta en el CENTRO exacto de la mesa y la
 * cadena crece en ambos sentidos desde ella:
 *  - Brazo DERECHO (board[ancla..n-1]): crece hacia la derecha en la fila
 *    central; al llegar al borde dobla hacia ABAJO (fila 1, 2, 3…) como
 *    serpiente.
 *  - Brazo IZQUIERDO (board[0..ancla] recorrido al revés): crece hacia la
 *    izquierda en la fila central; al llegar al borde dobla hacia ARRIBA
 *    (fila -1, -2…).
 *  - Al ocupar cada brazo franjas de filas DISJUNTAS (uno baja, el otro sube)
 *    jamás se cruzan: no hay colisiones ni huecos de frontera.
 *
 * Geometría:
 *  - u: unidad de ficha. Horizontal: 2u × u · Vertical (dobles y giros): u × 2u.
 *  - Fila k: centro vertical y = shift + k·2u. Una ficha de fieltro entre filas;
 *    los dobles (perpendiculares) y los giros nunca rozan la fila contigua.
 *  - Giro (ficha de esquina): vertical, centrado entre dos filas; arriba
 *    muestra `left` y abajo `right` (igual en ambos brazos, porque el giro del
 *    brazo izquierdo deja la fila que abandona en su mitad INFERIOR).
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

interface PathResult {
  slots: Map<string, Slot>
  /** fila más baja alcanzada (los giros cuentan como fila k+rowStep) */
  maxRow: number
  /** fila más alta alcanzada */
  minRow: number
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

/**
 * Tiende UN brazo (en orden desde el ancla) sobre su serpiente.
 * Devuelve el slot de cada ficha y el rango de filas usado.
 */
function pathArm(tiles: BoardTile[], W: number, u: number, opts: ArmOptions): PathResult {
  const slots = new Map<string, Slot>()
  const step = 2 * u
  const half = u / 2
  // La fila k siempre está en y = cy0 + k·step: k negativos (brazo izquierdo)
  // quedan ARRIBA del centro y k positivos (brazo derecho) ABAJO. rowStep solo
  // decide hacia qué fila avanza cada brazo (kNext = k + rowStep).
  const cyOf = (k: number) => opts.cy0 + k * step
  let maxRow = 0
  let minRow = 0
  if (tiles.length === 0 || W < 2 * u) return { slots, maxRow, minRow }

  let k = 0
  let dir: 1 | -1 = opts.startDir
  let cursor = opts.cursor

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]
    const w = t.isDouble ? u : 2 * u
    // Reserva de giro: mientras queden fichas en el brazo, la fila guarda
    // espacio u + GAP al final para que el giro quepa pegado a la última ficha.
    const reserve = i < tiles.length - 1 ? u + GAP : 0
    const fits = dir === 1 ? cursor + w + reserve <= W : cursor - w - reserve >= 0

    if (fits) {
      const x0 = dir === 1 ? cursor : cursor - w
      slots.set(t.id, {
        cx: x0 + w / 2,
        cy: cyOf(k),
        vertical: t.isDouble,
        // Fila en el sentido inicial del brazo: sin espejo.
        // Fila de vuelta: espejada (los dobles son simétricos, no la necesitan).
        flip: dir !== opts.startDir && !t.isDouble,
        corner: false,
      })
      maxRow = Math.max(maxRow, k)
      minRow = Math.min(minRow, k)
      cursor = dir === 1 ? x0 + w + GAP : x0 - GAP
    } else {
      // Giro de esquina: vertical al final de la fila, cruzando a la fila
      // contigua (abajo si el brazo baja, arriba si sube). Arriba = left,
      // abajo = right en ambos brazos.
      const gx = dir === 1 ? Math.min(cursor, W - u) : Math.max(cursor - u, 0)
      const kNext = k + opts.rowStep
      slots.set(t.id, {
        cx: gx + half,
        cy: cyOf(k) + opts.rowStep * u,
        vertical: true,
        flip: false,
        corner: true,
      })
      maxRow = Math.max(maxRow, kNext)
      minRow = Math.min(minRow, kNext)
      k = kNext
      dir = dir === 1 ? -1 : 1
      cursor = dir === 1 ? gx + u + GAP : gx - GAP
    }
  }
  return { slots, maxRow, minRow }
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
  const cy0 = 0
  // El ancla se coloca a mano, EXACTAMENTE en el centro (nunca es giro).
  // Ambos brazos excluyen el ancla y arrancan pegados a sus bordes.
  const anchorSlot: Slot = { cx, cy: cy0, vertical: anchor.isDouble, flip: false, corner: false }
  const armR: ArmOptions = { cursor: cx + ahw + GAP, startDir: 1, cy0, rowStep: 1 }
  const armL: ArmOptions = { cursor: cx - ahw - GAP, startDir: -1, cy0, rowStep: -1 }

  const right = pathArm(rightSeq.slice(1), W, u, armR)
  const left = pathArm(leftSeq, W, u, armL)

  // Zonas de colocación: tendemos cada brazo con una ficha virtual en su
  // extremo y leemos dónde aterriza. Es la posición EXACTA de destino.
  const ghostR: BoardTile = { id: '__ghost_right__', left: 0, right: 0, isDouble: false }
  const withRight = pathArm([...rightSeq.slice(1), ghostR], W, u, armR)
  const nextRight = withRight.slots.get(ghostR.id) ?? null

  const ghostL: BoardTile = { id: '__ghost_left__', left: 0, right: 0, isDouble: false }
  const withLeft = pathArm([...leftSeq, ghostL], W, u, armL)
  const nextLeft = withLeft.slots.get(ghostL.id) ?? null

  // Desplazamiento vertical: la fila más alta (podría ser negativa, brazo
  // izquierdo hacia arriba) queda con su banda empezando en y=0.
  const minRow = Math.min(0, left.minRow, withLeft.minRow)
  const maxRow = Math.max(0, right.maxRow, left.maxRow, withRight.maxRow, withLeft.maxRow)
  const shift = u - minRow * 2 * u

  const slots = new Map<string, Slot>()
  const shiftSlot = (s: Slot): Slot => ({ ...s, cy: s.cy + shift })
  slots.set(anchor.id, shiftSlot(anchorSlot))
  for (const [id, s] of right.slots) slots.set(id, shiftSlot(s))
  for (const [id, s] of left.slots) slots.set(id, shiftSlot(s))

  const height = (maxRow - minRow + 1) * 2 * u
  return {
    slots,
    height,
    nextLeft: nextLeft ? shiftSlot(nextLeft) : null,
    nextRight: nextRight ? shiftSlot(nextRight) : null,
  }
}
