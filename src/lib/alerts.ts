let audio: AudioContext | null = null

/** Call from a click handler so the browser allows sound later. */
export function unlockAlerts() {
  try {
    audio ??= new AudioContext()
    if (audio.state === 'suspended') void audio.resume()
  } catch { /* no audio support */ }
  if ('Notification' in window && Notification.permission === 'default') {
    void Notification.requestPermission()
  }
}

export function notificationsBlocked() {
  return 'Notification' in window && Notification.permission === 'denied'
}

export function chime() {
  if (!audio) return
  const t = audio.currentTime
  for (const [i, freq] of [660, 880, 660].entries()) {
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = freq
    osc.type = 'sine'
    gain.gain.setValueAtTime(0.0001, t + i * 0.22)
    gain.gain.exponentialRampToValueAtTime(0.25, t + i * 0.22 + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.2)
    osc.connect(gain).connect(audio.destination)
    osc.start(t + i * 0.22)
    osc.stop(t + i * 0.22 + 0.21)
  }
}

export function notify(title: string, body: string, onClick: () => void): Notification | null {
  if (!('Notification' in window) || Notification.permission !== 'granted') return null
  const n = new Notification(title, { body, requireInteraction: true, tag: 'check-in' })
  n.onclick = () => {
    window.focus()
    onClick()
    n.close()
  }
  return n
}

let blink: number | undefined
const baseTitle = document.title

export function blinkTitle(on: boolean, text = 'Še delaš?') {
  clearInterval(blink)
  document.title = baseTitle
  if (!on) return
  let flip = false
  blink = window.setInterval(() => {
    flip = !flip
    document.title = flip ? `● ${text}` : baseTitle
  }, 1000)
}
