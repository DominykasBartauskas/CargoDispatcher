import { useRef, useState } from 'react'
import type { DragEvent } from 'react'

/**
 * HTML5 drag-and-drop reordering of `.card` elements, ported from the legacy
 * delegated dragstart/dragover/drop handlers. `onReorder` is called with the
 * dragged id and the drop-target id when they differ.
 */
export function useReorder(onReorder: (fromId: string, toId: string) => void) {
  const dragId = useRef<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const clear = () => {
    dragId.current = null
    setOverId(null)
    setDraggingId(null)
  }

  const handleProps = (id: string) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      dragId.current = id
      setDraggingId(id)
      e.dataTransfer.effectAllowed = 'move'
      try {
        e.dataTransfer.setData('text/plain', id)
      } catch {
        /* some browsers throw on setData during dragstart */
      }
      const card = (e.currentTarget as HTMLElement).closest('.card')
      if (card) e.dataTransfer.setDragImage(card, 20, 20)
    },
  })

  const cardProps = (id: string) => ({
    onDragOver: (e: DragEvent) => {
      if (!dragId.current || dragId.current === id) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      setOverId(id)
    },
    onDragLeave: (e: DragEvent) => {
      if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null))
        setOverId((o) => (o === id ? null : o))
    },
    onDrop: (e: DragEvent) => {
      e.preventDefault()
      const from = dragId.current
      if (from && from !== id) onReorder(from, id)
      clear()
    },
    onDragEnd: clear,
  })

  return { handleProps, cardProps, overId, draggingId }
}
