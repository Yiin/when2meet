import { onBeforeUnmount, ref } from 'vue'

export type DragMode = 'fill' | 'clear'

export interface DragSelectOptions {
  /** Current filled set — used to decide drag mode from the first cell. */
  isFilled: (slot: string) => boolean
  /** Invoked per cell entered during the drag (including the first). */
  onEnter: (slot: string, mode: DragMode) => void
  /** Invoked when the drag ends. */
  onEnd: () => void
}

/**
 * Drag-to-toggle for grid cells. Cells expose themselves via a
 * `data-slot` attribute on a `data-testid="slot-cell"` element.
 *
 * Uses mouse events (mousedown/mousemove/mouseup) because Playwright's
 * `page.mouse` helpers simulate raw mouse events; those also work for normal
 * desktop interactions.
 */
export function useDragSelect(opts: DragSelectOptions) {
  const dragging = ref(false)
  const mode = ref<DragMode>('fill')
  const visited = new Set<string>()

  function slotFromPoint(clientX: number, clientY: number): string | null {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null
    if (!el) return null
    const cell = el.closest<HTMLElement>('[data-testid="slot-cell"]')
    if (!cell) return null
    return cell.getAttribute('data-slot')
  }

  function processCell(slot: string) {
    if (visited.has(slot)) return
    visited.add(slot)
    opts.onEnter(slot, mode.value)
  }

  function onMouseMove(e: MouseEvent) {
    if (!dragging.value) return
    const slot = slotFromPoint(e.clientX, e.clientY)
    if (slot) processCell(slot)
  }

  function onMouseUp() {
    if (!dragging.value) return
    dragging.value = false
    visited.clear()
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    document.body.classList.remove('no-select')
    opts.onEnd()
  }

  function start(slot: string, event?: MouseEvent) {
    if (event) event.preventDefault()
    mode.value = opts.isFilled(slot) ? 'clear' : 'fill'
    dragging.value = true
    visited.clear()
    processCell(slot)
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
