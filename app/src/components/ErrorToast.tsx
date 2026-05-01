import { useEffect } from 'react'
import type { FlipError } from '../hooks/useFlip'

type Props = {
  error: FlipError
  onDismiss: () => void
}

const ICONS: Record<FlipError['type'], string> = {
  tx_rejected: '\u2717',
  vrf_timeout: '\u23F1',
  network: '\u26A0',
  unknown: '!',
}

export default function ErrorToast({ error, onDismiss }: Props) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000)
    return () => clearTimeout(t)
  }, [error, onDismiss])

  const retryable = error.type === 'network' || error.type === 'vrf_timeout'

  return (
    <div className={`err-toast ${retryable ? 'err-toast-retry' : ''}`} onClick={onDismiss}>
      <span className="err-icon">{ICONS[error.type]}</span>
      <span className="err-msg">{error.message}</span>
      <button className="err-close">&times;</button>
    </div>
  )
}
