import { useEffect } from 'react'

export function Toast({
  message,
  onClose,
  variant = 'info',
}: {
  message: string
  onClose: () => void
  variant?: 'info' | 'success' | 'error'
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500)
    return () => clearTimeout(t)
  }, [message, onClose])

  const styles = {
    info: 'bg-surface-800/95 border-brand-500/30 text-brand-200',
    success: 'bg-emerald-950/95 border-emerald-500/30 text-emerald-200',
    error: 'bg-rose-950/95 border-rose-500/30 text-rose-200',
  }

  return (
    <div className={`fixed bottom-20 md:bottom-6 right-4 z-[9999] max-w-xs px-4 py-3 rounded-xl border backdrop-blur-xl shadow-lg text-sm ${styles[variant]}`}>
      <div className="flex items-start gap-2">
        <span className="flex-1">{message}</span>
        <button onClick={onClose} className="text-surface-500 hover:text-white flex-shrink-0">✕</button>
      </div>
    </div>
  )
}