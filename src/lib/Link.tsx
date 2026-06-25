import { ReactNode, MouseEvent } from 'react'

export function Link({ href, children, className, onClick }: { href: string; children: ReactNode; className?: string; onClick?: () => void }) {
  const handleClick = (e: MouseEvent) => {
    if (href.startsWith('#')) {
      e.preventDefault()
      window.location.hash = href
      onClick?.()
    }
  }
  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  )
}
