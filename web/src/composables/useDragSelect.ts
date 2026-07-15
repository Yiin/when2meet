import { onBeforeUnmount, ref } from 'vue'

export type DragMode = 'fill' | 'clear'

interface CellRef {
  ri: number
  ci: number
  slot: string
}

export interface DragSelectOptions {
  /** Current filled set — used to decide drag mode from the anchor cell. */
  isFilled: (slot: string) => boolean
  /**
   * The full set of slots inside the current drag rectangle, recomputed on
   * every move. The selection both grows and shrinks as the pointer moves, so
   * the parent must treat this as the complete current selection, not a delta.
   */
  onSelection: (slots: string[], mode: DragMode) => void
  /** Invoked when the drag ends. */
  onEnd: () => void
}

/**
 * Drag-to-paint for grid cells, modelled as an invisible rectangle selector.
 * The rectangle spans from the anchor cell (mousedown) to the cell under the
 * pointer, covering every cell in that box across rows AND columns. Because the
 * selection is derived from the two corners rather than the path the pointer
 * traced, fast drags never skip cells.
 *
 * Cells expose their grid position via `data-ri` / `data-ci` and their slot key
 * via `data-slot`, all on the `data-testid="slot-cell"` element.
 *
 * Uses mouse events (mousedown/mousemove/mouseup) because Playwright's
 * `page.mouse` helpers simulate raw mouse events; those also work for normal
 * desktop interactions.
 */
export function useDragSelect(opts: DragSelectOptions) {
  const dragging = ref(false)
  const mode = ref<DragMode>('fill')

  // Snapshot of all cells, captured at drag start (the grid is static mid-drag).
  let cells: CellRef[] = []
  let anchor: { ri: number; ci: number } | null = null
  let current: { ri: number; ci: number } | null = null

  function cellFromElement(el: HTMLElement | null): CellRef | null {
    if (!el) return null
    const cell = el.closest<HTMLElement>('[data-testid="slot-cell"]')
    if (!cell) return null
    const slot = cell.getAttribute('data-slot')
    const ri = cell.getAttribute('data-ri')
    const ci = cell.getAttribute('data-ci')
    if (slot == null || ri == null || ci == null) return null
    return { slot, ri: Number(ri), ci: Number(ci) }
  }

  function cellFromPoint(clientX: number, clientY: number): CellRef | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    return cellFromElement(el)
  }

  function collectCells(): CellRef[] {
    const out: CellRef[] = []
    document
      .querySelectorAll<HTMLElement>('[data-testid="slot-cell"]')
      .forEach((el) => {
        const cell = cellFromElement(el)
        if (cell) out.push(cell)
      })
    return out
  }

  function emitSelection() {
    if (!anchor || !current) return
    const minRi = Math.min(anchor.ri, current.ri)
    const maxRi = Math.max(anchor.ri, current.ri)
    const minCi = Math.min(anchor.ci, current.ci)
    const maxCi = Math.max(anchor.ci, current.ci)
    const slots: string[] = []
    for (const cell of cells) {
      if (
        cell.ri >= minRi &&
        cell.ri <= maxRi &&
        cell.ci >= minCi &&
        cell.ci <= maxCi
      ) {
        slots.push(cell.slot)
      }
    }
    opts.onSelection(slots, mode.value)
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging.value) return
    const cell = cellFromPoint(e.clientX, e.clientY)
    if (!cell) return
    if (current && cell.ri === current.ri && cell.ci === current.ci) return
    current = { ri: cell.ri, ci: cell.ci }
    emitSelection()
  }

  function onMouseUp() {
    if (!dragging.value) return
    dragging.value = false
    cells = []
    anchor = null
    current = null
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.classList.remove('no-select')
    opts.onEnd()
  }

  function start(slot: string, event: MouseEvent) {
    event.preventDefault()
    cells = collectCells()
    const cell = cells.find((c) => c.slot === slot)
    if (!cell) return
    mode.value = opts.isFilled(slot) ? 'clear' : 'fill'
    dragging.value = true
    anchor = { ri: cell.ri, ci: cell.ci }
    current = { ri: cell.ri, ci: cell.ci }
    emitSelection()
    document.body.classList.add('no-select')
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }

  onBeforeUnmount(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.classList.remove('no-select')
  })

  return { dragging, start }
}
