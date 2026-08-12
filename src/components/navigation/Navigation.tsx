import { Bell, Compass, House, Library, Menu, Search, UserRound } from 'lucide-react'
import { IconButton } from '../ui/Button'
import './navigation.css'
export type ViewMode = 'home' | 'detail' | 'player' | 'library' | 'profile'

export function Brand({ onClick }: { onClick?: () => void }) {
  return (
    <a
      className="brand"
      href="#top"
      aria-label="7anime home"
      onClick={e => {
        if (onClick) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <span>7</span>anime
    </a>
  )
}

export function DesktopNavbar({
  onMenu,
  onSearch,
  onNavigate,
  currentView = 'home'
}: {
  onMenu: () => void
  onSearch: () => void
  onNavigate?: (view: ViewMode) => void
  currentView?: ViewMode
}) {
  return (
    <header className="desktop-nav glass">
      <Brand onClick={() => onNavigate?.('home')} />
      <nav aria-label="Main navigation">
        <a
          className={currentView === 'home' ? 'active' : ''}
          href="#home"
          onClick={e => { e.preventDefault(); onNavigate?.('home') }}
        >
          Home
        </a>
        <a
          className={currentView === 'library' ? 'active' : ''}
          href="#library"
          onClick={e => { e.preventDefault(); onNavigate?.('library') }}
        >
          Library
        </a>
        <a
          className={currentView === 'profile' ? 'active' : ''}
          href="#profile"
          onClick={e => { e.preventDefault(); onNavigate?.('profile') }}
        >
          My Space
        </a>
      </nav>
      <div className="desktop-nav__actions">
        <IconButton label="Search" onClick={onSearch}>
          <Search size={18} />
        </IconButton>
        <IconButton label="Notifications">
          <Bell size={18} />
        </IconButton>
        <button
          className="profile-chip"
          onClick={() => onNavigate ? onNavigate('profile') : onMenu()}
        >
          <UserRound size={16} /> Yuki
        </button>
      </div>
    </header>
  )
}

export function MobileNavigation({
  onNavigate,
  currentView = 'home'
}: {
  onNavigate?: (view: ViewMode) => void
  currentView?: ViewMode
}) {
  const items = [
    ['Home', House, 'home'],
    ['Explore', Compass, 'home'],
    ['Library', Library, 'library'],
    ['Profile', UserRound, 'profile']
  ] as const

  return (
    <nav className="mobile-nav glass" aria-label="Mobile navigation">
      {items.map(([name, Icon, targetView]) => (
        <a
          className={currentView === targetView ? 'active' : ''}
          href={`#${targetView}`}
          key={name}
          onClick={e => {
            e.preventDefault()
            onNavigate?.(targetView as ViewMode)
          }}
        >
          <Icon size={20} />
          <span>{name}</span>
        </a>
      ))}
    </nav>
  )
}

export function MenuTrigger({ onClick }: { onClick: () => void }) {
  return (
    <IconButton label="Open menu" onClick={onClick}>
      <Menu size={18} />
    </IconButton>
  )
}

