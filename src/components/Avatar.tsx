import { useApp } from '../lib/context'
import { onColor, personColor } from '../lib/colors'

/** Initial in a circle of the person's color. `live` adds a blinking dot for a running session. */
export function Avatar({ id, size = 'md', live = false }: { id: string; size?: 'sm' | 'md' | 'lg' | 'xl'; live?: boolean }) {
  const { byId } = useApp()
  const p = byId.get(id)
  const bg = personColor(p?.color)
  return (
    <span
      className={`av av-${size}${live ? ' live' : ''}`}
      style={{ background: bg, color: onColor(bg) }}
      aria-hidden="true"
    >
      {(p?.display_name ?? '?').trim().charAt(0).toUpperCase()}
    </span>
  )
}
