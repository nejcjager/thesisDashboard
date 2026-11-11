import { useApp } from '../lib/context'

export function Name({ id }: { id: string }) {
  const { byId } = useApp()
  const p = byId.get(id)
  return (
    <span className="name">
      <span className="swatch" style={{ background: p?.color ?? 'currentColor' }} />
      {p?.display_name ?? '—'}
    </span>
  )
}
