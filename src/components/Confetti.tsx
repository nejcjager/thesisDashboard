import { useMemo } from 'react'
import { PALETTE } from '../lib/colors'

/** A one-off burst over the podium when you won a finished week. Hidden with reduced motion (styles.css). */
export function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 46 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    background: i % 4 === 0 ? '#f5b81c' : PALETTE[i % PALETTE.length],
    animationDelay: `${(Math.random() * 0.6).toFixed(2)}s`,
    transform: `rotate(${Math.round(Math.random() * 180)}deg)`,
  })), [])
  return <div className="confetti" aria-hidden="true">{pieces.map((s, i) => <i key={i} style={s} />)}</div>
}
