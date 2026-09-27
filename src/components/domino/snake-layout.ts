/**
 * Layout "serpiente" CONTINUO del tablero de dominó (como en la mesa real).
 *
 * La cadena completa (board[0] → board[n-1]) se tiende como UNA sola línea,
 * igual que un texto que salta de renglón:
 *  - Las fichas se colocan en orden de cadena, siempre PEGADAS a la anterior
 *    (separadas solo GAP de cortesía). Nunca hay huecos ni filas a medias.
 *  - Cuando la siguiente ficha ya no cabe en la fila, esa ficha SE DOBLA:
 *    se planta vertical al final de la fila (cruzando hacia el renglón
 *    siguiente) y la cadena continúa por la fila de abajo en dirección
 *    contraria, arrancando justo a su lado. Como en la mesa real.
 *  - Cada fila reserva u + GAP al final mientras queden fichas por colocar,
 *    de modo que la ficha de giro siempre quepa pegada a la última ficha.
 *
 * Geometría:
 *  - u: unidad de ficha. Horizontal: 2u × u · Vertical (dobles y giros): u × 2u.
 *  - Fila k: centro vertical y = u + k·2u — queda una ficha de fieltro entre
 *    filas; los dobles (perpendicular) y los giros nunca rozan la fila contigua.
 *  - Giro (ficha de esquina): vertical, centrado entre dos filas
 *    (y = centroFila(k) + u); arriba muestra `left` (conecta con la fila k) y
 *    abajo `right` (conecta con la fila k+1).
 *
 * Orientación de los valores: la cadena respeta board[i].right === board[i+1].left
 * en pantalla. En las filas de ida (izquierda→derecha) las fichas van sin espejo;
 * en las filas de vuelta (derecha→izquierda) van espejadas (scaleX) porque la
 * cadena se tiende en orden inverso.
 *
 * Zonas de colocación (nextLeft / nextRight): se calculan tendiendo la cadena
 * con una ficha virtual añadida al extremo correspondiente, de modo que la
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
  /** fila más baja alcanzada (los giros cuentan como fila k+1) */
  maxRow: number
}

/**
 * Tiende las fichas (en orden de cadena) sobre el camino serpenteante.
 * Devuelve el slot de cada ficha y la fila más baja usada.
 */
function pathSlots(tiles: BoardTile[], W: number, u: number): PathResult {
  const slots = new Map<string, Slot>()
  const step = 2 * u
  const half = u / 2
  const cy = (k: number) => u + k * step
  let maxRow = 0
  if (tiles.length === 0 || W < 2 * u) return { slots, maxRow }

  let k = 0
  let dir: 1 | -1 = 1 // fila 0: izquierda → derecha
  // cursor: para dir=1, borde IZQUIERDO de la próxima ficha;
  //         para dir=-1, borde DERECHO de la próxima ficha.
  let cursor = 0

  for (let i = 0; i < tiles.length; i++) {
    const t = tiles[i]
    const w = t.isDouble ? u : 2 * u
    // Reserva de giro: mientras queden fichas en la cadena, la fila guarda
    // espacio u + GAP al final para que el giro quepa pegado a la última ficha.
    const reserve = i < tiles.length - 1 ? u + GAP : 0
    const fits = dir === 1 ? cursor + w + reserve <= W : cursor - w - reserve >= 0

    if (fits) {
      const x0 = dir === 1 ? cursor : cursor - w
      slots.set(t.id, {
        cx: x0 + w / 2,
        cy: cy(k),
        vertical: t.isDouble,
        // Fila de ida: sin espejo. Fila de vuelta: espejada (los dobles son
        // simétricos, no la necesitan).
        flip: dir === -1 && !t.isDouble,
        corner: false,
      })
      maxRow = Math.max(maxRow, k)
      cursor = dir === 1 ? x0 + w + GAP : x0 - GAP
    } else {
      // Giro de esquina: vertical al final de la fila, cruzando al renglón
      // siguiente. Arriba = left (toca a la fila k), abajo = right (toca a la k+1).
      const gx = dir === 1 ? Math.min(cursor, W - u) : Math.max(cursor - u, 0)
      slots.set(t.id, {
        cx: gx + half,
        cy: cy(k) + u,
        vertical: true,
        flip: false,
        corner: true,
      })
      maxRow = Math.max(maxRow, k + 1)
      k += 1
      dir = dir === 1 ? -1 : 1
      cursor = dir === 1 ? gx + u + GAP : gx - GAP
    }
  }
  return { slots, maxRow }
}

export function layoutSnake(board: BoardTile[], W: number, u: number): SnakeLayout {
  const empty: SnakeLayout = { slots: new Map(), height: 0, nextLeft: null, nextRight: null }
  if (board.length === 0 || W <= 0 || u <= 0) return empty
  if (W < u * 4) return empty

  const base = pathSlots(board, W, u)

  // Zonas de colocación: tendemos la cadena con una ficha virtual en cada
  // extremo y leemos dónde aterriza. Es la posición EXACTA de destino.
  const ghostR: BoardTile = { id: '__ghost_right__', left: 0, right: 0, isDouble: false }
  const withRight = pathSlots([...board, ghostR], W, u)
  const nextRight = withRight.slots.get(ghostR.id) ?? null

  const ghostL: BoardTile = { id: '__ghost_left__', left: 0, right: 0, isDouble: false }
  const withLeft = pathSlots([ghostL, ...board], W, u)
  const nextLeft = withLeft.slots.get(ghostL.id) ?? null

  const maxRow = Math.max(
    base.maxRow,
    nextRight ? withRight.maxRow : 0,
    nextLeft ? withLeft.maxRow : 0
  )
  const height = 2 * u + maxRow * 2 * u
  return { slots: base.slots, height, nextLeft, nextRight }
}
