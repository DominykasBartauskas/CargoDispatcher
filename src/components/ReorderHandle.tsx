import type { HandleProps, MoveProps } from '../lib/useReorder'

/**
 * Card reordering control: the drag handle (desktop mouse) plus up/down
 * buttons (work on touch too, where native HTML5 drag doesn't fire).
 */
export function ReorderHandle({ handle, move }: { handle: HandleProps; move: MoveProps }) {
  return (
    <span className="reorder">
      <span className="draghandle" title="Drag to reorder" {...handle}>
        ⠿
      </span>
      <button className="btn small movebtn" title="Move up" disabled={!move.canUp} onClick={move.up}>
        ↑
      </button>
      <button
        className="btn small movebtn"
        title="Move down"
        disabled={!move.canDown}
        onClick={move.down}
      >
        ↓
      </button>
    </span>
  )
}
