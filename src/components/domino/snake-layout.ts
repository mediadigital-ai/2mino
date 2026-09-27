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
 *    (y = centroBanda(k) + u) cruzando el hueco.
 *
 * Filas tensas: como el layout se recalcula con la cadena completa, cada banda
 * sabe de antemano si dobla. Si dobla, el sobrante de la fila se reparte entre
 * sus huecos para que el giro aterrice EXACTAMENTE pegado al borde exterior (o
 * a la frontera central) y la fila siguiente arranque justo a su lado — sin
 * dejar parches de fieltro vacío entre el borde y la esquina.
 *
 * Orientación de los valores: la cadena respeta board[i].right === board[i+1].left
 * en pantalla. En las filas "de ida" las fichas van sin espejo (el orden físico
 * izquierda→derecha coincide con el orden de la cadena) y en las filas "de vuelta"
 * van espejadas (scaleX): la cadena se tiende en orden inverso. Un giro del lado
 * izquierdo toca la fila anterior por la mitad IZQUIERDA de la ficha previa, así
 * que se dibuja con los valores intercambiados (arriba = right).
 *
 *  - Frontera central (x = W/2): los carriles impares de cada lado no la cruzan,
 *    así el lado izquierdo y derecho nunca se pisan (deja 2·GAP entre giros opuestos).
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
   * Espejo: en fichas horizontales invierte izquierda/derecha (fila de vuelta);
   * en giros verticales intercambia arriba/abajo (solo lado izquierdo).
   */
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
   * Recorre un lado (side=+1 derecha, -1 izquierda) en dos fases:
   *  A) reparte las fichas en bandas con el mismo cupo de siempre;
   *  B) las posiciona tensando cada banda que dobla para que su giro quede
   *     pegado a la frontera. Devuelve el slot "fantasma" del extremo.
   */
  const walk = (side: 1 | -1): Slot => {
    // ---------- Fase A: reparto en bandas ----------
    interface Band {
      items: { t: BoardTile; w: number }[]
      corner: BoardTile | null
    }
    const bands: Band[] = [{ items: [], corner: null }]
    let bi = 0
    let x = side === 1 ? cxc + aHalf + GAP : cxc - aHalf - GAP
    const startX = x
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
    /** Posición compacta (adyacente a la cadena) del giro de la banda b. */
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
      if (fits(w, bi, x)) {
        bands[bi].items.push({ t, w })
        x += (dirOf(bi) === 1 ? 1 : -1) * (w + GAP)
      } else {
        // La ficha no cabe: SE DOBLA en la esquina (vertical, cruzando el hueco).
        bands[bi].corner = t
        // El cursor de la banda siguiente se calcula desde la posición FINAL
        // del giro: tensada contra el borde físico en bandas pares CON fichas
        // (Fase B la coloca ahí), compacta en impares y bandas vacías. Así la
        // Fase A y la Fase B comparten exactamente la misma geometría.
        const gx =
          bi % 2 === 0 && bands[bi].items.length > 0 ? (side === 1 ? W - u : 0) : cornerPos(bi, x)
        bi++
        bands.push({ items: [], corner: null })
        const nd = dirOf(bi)
        x = nd === 1 ? gx + u + GAP : gx - GAP
      }
      i += side
    }

    // ---------- Fase B: posicionado con filas tensas ----------
    // "start" = borde de contacto del primer elemento de la banda (ya separa GAP).
    let start = startX
    const last = bands.length - 1
    // cursor de fin de cada banda: borde de contacto del siguiente elemento
    let endCursor = startX
    let endBand = 0

    for (let k = 0; k < bands.length; k++) {
      const { items, corner } = bands[k]
      const sgn = dirOf(k) // +1 la banda crece hacia la derecha, -1 hacia la izquierda
      // Frontera lejana: borde exterior del tablero en bandas pares, frontera
      // central (con GAP de cortesía) en impares.
      const far = k % 2 === 0 ? (side === 1 ? W : 0) : side === 1 ? cxc + GAP : cxc - GAP
      const N = items.length

      // Bandas abiertas y pliegues en la franja central: COMPACTAS (el hueco
      // sobrante es espacio de mesa, no de cadena). Solo se tensan las bandas
      // que doblan contra el borde físico del tablero.
      if (!corner || k % 2 === 1) {
        let edge = start
        for (const { t, w } of items) {
          const x0 = sgn === 1 ? edge : edge - w
          slots.set(t.id, {
            cx: x0 + w / 2,
            cy: cy(k),
            vertical: t.isDouble,
            // Fila de ida (sgn === side): sin espejo. Vuelta: espejada.
            flip: sgn !== side && !t.isDouble,
            corner: false,
          })
          maxBand = Math.max(maxBand, k)
          edge = sgn === 1 ? x0 + w + GAP : x0 - GAP
        }
        if (corner) {
          const gx = cornerPos(k, edge)
          slots.set(corner.id, {
            cx: gx + half,
            cy: cy(k) + step / 2,
            vertical: true,
            flip: side === -1,
            corner: true,
          })
          maxBand = Math.max(maxBand, k + 1)
          const nd = dirOf(k + 1)
          endCursor = nd === 1 ? gx + u + GAP : gx - GAP
          endBand = k + 1
          start = endCursor
        } else {
          endCursor = edge
          endBand = k
          start = edge
        }
        continue
      }

      if (N === 0) {
        // Giro sin fichas en la banda (doble pliegue): adyacente a la cadena.
        const gx = cornerPos(k, start)
        slots.set(corner.id, {
          cx: gx + half,
          cy: cy(k) + step / 2,
          vertical: true,
          flip: side === -1,
          corner: true,
        })
        maxBand = Math.max(maxBand, k + 1)
        const nd = dirOf(k + 1)
        endCursor = nd === 1 ? gx + u + GAP : gx - GAP
        endBand = k + 1
        start = endCursor
        continue
      }

      // Banda par que dobla contra el BORDE FÍSICO: se TENSA. El sobrante se
      // reparte a partes iguales entre los huecos internos (entre fichas + antes
      // del giro; el hueco de arranque ya va incorporado en "start") para que
      // el giro aterrice exactamente pegado al borde.
      const sumW = items.reduce((acc, it) => acc + it.w, 0)
      const natural = sumW + N * GAP + u // huecos: N-1 internos + 1 del giro
      const available = Math.abs(far - start)
      const extra = Math.max(available - natural, 0)
      const g = GAP + extra / N

      let edge = start
      for (const { t, w } of items) {
        const x0 = sgn === 1 ? edge : edge - w
        slots.set(t.id, {
          cx: x0 + w / 2,
          cy: cy(k),
          vertical: t.isDouble,
          flip: sgn !== side && !t.isDouble,
          corner: false,
        })
        maxBand = Math.max(maxBand, k)
        edge = sgn === 1 ? x0 + w + g : x0 - g
      }
      // Giro pegado a la frontera lejana
      const gx = sgn === 1 ? far - u : far
      slots.set(corner.id, {
        cx: gx + half,
        cy: cy(k) + step / 2,
        vertical: true,
        flip: side === -1,
        corner: true,
      })
      maxBand = Math.max(maxBand, k + 1)
      const nd = dirOf(k + 1)
      endCursor = nd === 1 ? gx + u + GAP : gx - GAP
      endBand = k + 1
      start = endCursor
    }

    // ---------- Slot fantasma: dónde caería la siguiente ficha del extremo ----------
    const dir = dirOf(endBand)
    if (fits(2 * u, endBand, endCursor)) {
      maxBand = Math.max(maxBand, endBand)
      return {
        cx: dir === 1 ? endCursor + u : endCursor - u,
        cy: cy(endBand),
        vertical: false,
        flip: dir !== side,
        corner: false,
      }
    }
    // La siguiente ficha doblaría: contra el borde físico aterrizaría tensada
    // (pegada al borde); en la franja central o banda vacía, adyacente.
    const lastBand = bands[last]
    let gx: number
    if (lastBand.corner === null && lastBand.items.length > 0 && endBand % 2 === 0) {
      const sgn = dirOf(endBand)
      const far = endBand % 2 === 0 ? (side === 1 ? W : 0) : side === 1 ? cxc + GAP : cxc - GAP
      gx = sgn === 1 ? far - u : far
    } else {
      gx = cornerPos(endBand, endCursor)
    }
    maxBand = Math.max(maxBand, endBand + 1)
    return { cx: gx + half, cy: cy(endBand) + step / 2, vertical: true, flip: side === -1, corner: true }
  }

  const nextRight = walk(1)
  const nextLeft = walk(-1)

  const height = 2 * u + maxBand * step
  return { slots, height, nextLeft, nextRight }
}
