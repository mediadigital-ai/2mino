/**
 * Layout "serpiente" del tablero de dominó (como en la mesa real):
 * la cadena parte del centro (ficha de apertura) y crece hacia ambos lados.
 * Cuando un lado agota el ancho, la siguiente ficha SE DOBLA (vertical) en la
 * esquina y la cadena continúa por la fila inferior en dirección contraria,
 * siempre pegada al extremo que le corresponde. Nunca baja suelta al centro.
 *
 * Geometría:
 *  - u: unidad de ficha. Horizontal: 2u × u · Vertical (dobles y giros): u × 2u.
 *  - Banda (fila) k: centro vertical y = u + k·2u — deja UNA ficha de espacio
 *    visible entre filas; los dobles (±u) y los giros nunca rozan la fila contigua.
 *  - Giro (ficha de esquina): vertical, centrado entre dos bandas
 *    (y = centroBanda(k) + u) cruzando el hueco, pegada al extremo.
 *  - Frontera central (x = W/2): los carriles impares de cada lado no la cruzan,
 *    así el lado izquierdo y derecho nunca se pisan.
 */
import type { BoardTile } from '@/lib/domino/types'

export interface Slot {
  /** centro x en px dentro del contenedor */
  cx: number
  /** centro y en px dentro del contenedor */
  cy: number
  /** ficha girada (giro de esquina o doble perpendicular) */
  vertical: boolean
  /** espejo horizontal: la cadena avanza hacia la izquierda */
  flip: boolean
  /** es una ficha de giro entre dos bandas */
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

export function layoutSnake(board: BoardTile[], W: number, u: number, anchorIdx: number): SnakeLayout {
  const empty: SnakeLayout = { slots: new Map(), height: 0, nextLeft: null, nextRight: null }
  if (board.length === 0 || W <= 0 || u <= 0) return empty
  if (W < u * 4) return empty

  const safeAnchor = Math.min(Math.max(anchorIdx, 0), board.length - 1)
  const half = u / 2
  const step = 2 * u
  const cxc = W / 2
  const cy = (k: number) => u + k * step
  const slots = new Map<string, Slot>()
  let maxBand = 0

  // Ficha ancla (apertura), centrada en la mesa
  const a = board[safeAnchor]
  const aDouble = a.isDouble
  slots.set(a.id, { cx: cxc, cy: cy(0), vertical: aDouble, flip: false, corner: false })
  const aHalf = aDouble ? half : u

  /**
   * Recorre un lado (side=+1 derecha, -1 izquierda) colocando fichas en bandas.
   * Devuelve el slot "fantasma" donde caería la siguiente ficha (EndZone).
   */
  const walk = (side: 1 | -1): Slot => {
    let band = 0
    // x = borde de contacto donde empieza la próxima ficha según su dirección
    let x = side === 1 ? cxc + aHalf + GAP : cxc - aHalf - GAP
    let i = safeAnchor + side
    const more = () => (side === 1 ? i < board.length : i >= 0)

    const dirOf = (b: number) => (b % 2 === 0 ? side : -side)
    // Reserva para la ficha de giro: toda fila deja sitio al final para poder
    // doblar sin pisar la última ficha colocada (hueco de una ficha vertical).
    const R = u + GAP
    const limitOf = (b: number) => {
      const dir = dirOf(b)
      if (dir === 1) return (b % 2 === 0 && side === 1 ? W : cxc) - R
      return (b % 2 === 0 && side === -1 ? 0 : cxc) + R
    }
    const fits = (w: number, b: number, xx: number) => {
      const lim = limitOf(b)
      return dirOf(b) === 1 ? xx + w <= lim : xx - w >= lim
    }
    /** Borde izquierdo gx de la ficha de giro según banda y cursor. */
    const cornerPos = (b: number, xx: number): number => {
      if (b % 2 === 0) {
        // giro pegado al borde exterior del lado
        return side === 1 ? Math.min(xx, W - u) : Math.max(xx - u, 0)
      }
      // giro pegado a la frontera central
      return side === 1 ? Math.max(xx - u, cxc) : Math.min(xx, cxc - u)
    }

    while (more()) {
      const t = board[i]
      const w = t.isDouble ? u : 2 * u
      const dir = dirOf(band)
      if (fits(w, band, x)) {
        slots.set(t.id, {
          cx: dir === 1 ? x + w / 2 : x - w / 2,
          cy: cy(band),
          vertical: t.isDouble,
          flip: dir === -1 && !t.isDouble,
          corner: false,
        })
        maxBand = Math.max(maxBand, band)
        x += (dir === 1 ? 1 : -1) * (w + GAP)
      } else {
        // La ficha no cabe: SE DOBLA en la esquina (vertical, cruzando el hueco)
        const gx = cornerPos(band, x)
        slots.set(t.id, { cx: gx + half, cy: cy(band) + step / 2, vertical: true, flip: false, corner: true })
        maxBand = Math.max(maxBand, band + 1)
        band++
        const nd = dirOf(band)
        x = nd === 1 ? gx + u + GAP : gx - GAP
      }
      i += side
    }

    // Slot fantasma: dónde caería la siguiente ficha de este extremo
    const dir = dirOf(band)
    if (fits(2 * u, band, x)) {
      maxBand = Math.max(maxBand, band)
      return { cx: dir === 1 ? x + u : x - u, cy: cy(band), vertical: false, flip: dir === -1, corner: false }
    }
    const gx = cornerPos(band, x)
    maxBand = Math.max(maxBand, band + 1)
    return { cx: gx + half, cy: cy(band) + step / 2, vertical: true, flip: false, corner: true }
  }

  const nextRight = walk(1)
  const nextLeft = walk(-1)

  const height = 2 * u + maxBand * step
  return { slots, height, nextLeft, nextRight }
}
