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
    <header className={`desktop-nav glass-elevated ${currentView === 'player' ? 'desktop-nav--hidden' : ''}`}>
      <Brand onClick={() => onNavigate?.('home')} />
      <nav aria-label="Main navigation">
        <a
          className={currentView === 'home' ? 'active' : ''}
          href="#home"
          aria-current={currentView === 'home' ? 'page' : undefined}
          onClick={e => { e.preventDefault(); onNavigate?.('home') }}
        >
          Home
        </a>
        <a
          className={currentView === 'library' ? 'active' : ''}
          href="#library"
          aria-current={currentView === 'library' ? 'page' : undefined}
          onClick={e => { e.preventDefault(); onNavigate?.('library') }}
        >
          Library
        </a>
        <a
          className={currentView === 'profile' ? 'active' : ''}
          href="#profile"
          aria-current={currentView === 'profile' ? 'page' : undefined}
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
          className={`profile-chip ${currentView === 'profile' ? 'profile-chip--active' : ''}`}
          onClick={() => onNavigate ? onNavigate('profile') : onMenu()}
          aria-label="View user profile"
        >
          <span className="profile-chip__avatar" aria-hidden="true">
            <UserRound size={15} />
          </span>
          <span className="profile-chip__name">Yuki</span>
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
  if (currentView === 'player') return null

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
          className={name === 'Explore'
            ? ''
            : currentView === targetView ? 'active' : ''
          }
          href={`#${targetView}`}
          key={name}
          aria-current={name !== 'Explore' && currentView === targetView ? 'page' : undefined}
          onClick={e => {
            e.preventDefault()
            if (name === 'Explore') {
              onNavigate?.('home')
              setTimeout(() => {
                document.getElementById('anime')?.scrollIntoView({ behavior: 'smooth' })
              }, 100)
            } else {
              onNavigate?.(targetView as ViewMode)
            }
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
