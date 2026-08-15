import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({
  open,
  onClose,
  title,
  children
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    ref.current?.focus()

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="dialog glass-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        onMouseDown={e => e.stopPropagation()}
      >
        <button
          className="dialog__close"
          onClick={onClose}
          aria-label="Close dialog"
        >
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </section>
    </div>
  )
}

export function Drawer({
  open,
  onClose,
  children
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!open) return

    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    ref.current?.focus()

    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="overlay" role="presentation" onMouseDown={onClose}>
      <aside
        className="drawer glass-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation drawer"
        tabIndex={-1}
        ref={ref}
        onMouseDown={e => e.stopPropagation()}
      >
        {children}
      </aside>
    </div>
  )
}

