import { useEffect, type ReactNode } from 'react'

/** Centered dialog over a dimmed page. Without `onClose` it can't be dismissed (Esc or a click outside). */
export function Modal({ labelledBy, onClose, children }: { labelledBy: string; onClose?: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!onClose) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="scrim" onClick={e => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
        {children}
      </div>
    </div>
  )
}
