import {
  Bell,
  CalendarDays,
  Compass,
  Film,
  Flame,
  House,
  Library,
  LogIn,
  Menu,
  Search,
  UserRound,
} from 'lucide-react'
import { useEffect } from 'react'
import { IconButton } from '../ui/Button'
import logoImg from '../../public/logo.png'
import type { AuthUser } from '../../types/auth'
import './navigation.css'

export type ViewMode =
  | 'home'
  | 'movies'
  | 'detail'
  | 'player'
  | 'library'
  | 'profile'
  | 'schedule'

/* ─────────────────────────────────────────
   Brand
   ───────────────────────────────────────── */

export function Brand({
  onClick,
  compact = false,
}: {
  onClick?: () => void
  compact?: boolean
}) {
  return (
    <a
      className={`brand ${compact ? 'brand--compact' : ''}`}
      href="#top"
      aria-label="7anime home"
      onClick={e => {
        if (onClick) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      <img
        src={logoImg}
        alt="7anime"
        className="brand__logo"
      />
    </a>
  )
}

/* ─────────────────────────────────────────
   Desktop Horizontal Capsule Navbar
   Positioned top-center floating pill
   ───────────────────────────────────────── */

export function DesktopNavbar({
  onMenu,
  onSearch,
  onNavigate,
  onOpenAuthModal,
  onLogout,
  authUser,
  currentView = 'home',
}: {
  onMenu?: () => void
  onSearch: () => void
  onNavigate?: (view: ViewMode) => void
  onOpenAuthModal?: () => void
  onLogout?: () => void
  authUser?: AuthUser | null
  currentView?: ViewMode
}) {
  // Global search shortcut listener: Cmd/Ctrl+K or '/' opens search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === 'k' && (e.metaKey || e.ctrlKey)) ||
        (e.key === '/' &&
          !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName))
      ) {
        e.preventDefault()
        onSearch()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onSearch])

  if (currentView === 'player') return null

  const handleScrollTo = (elementId: string) => {
    onNavigate?.('home')
    setTimeout(() => {
      const el = document.getElementById(elementId)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' })
      }
    }, 80)
  }

  return (
    <header
      className="desktop-nav glass-elevated"
      aria-label="Main Navigation"
    >
      {/* 7Anime Logo Brand */}
      <Brand onClick={() => onNavigate?.('home')} />

      {/* Primary Navigation Links */}
      <nav aria-label="Main navigation">
        {/* Home */}
        <a
          className={currentView === 'home' ? 'active' : ''}
          href="#home"
          aria-current={currentView === 'home' ? 'page' : undefined}
          onClick={e => {
            e.preventDefault()
            onNavigate?.('home')
          }}
        >
          <House size={16} aria-hidden="true" />
          <span>Home</span>
        </a>

        {/* Discover */}
        <a
          href="#discover"
          onClick={e => {
            e.preventDefault()
            handleScrollTo('discovery-catalog')
          }}
        >
          <Compass size={16} aria-hidden="true" />
          <span>Discover</span>
        </a>

        {/* Movies */}
        <a
          className={currentView === 'movies' ? 'active' : ''}
          href="#movies"
          aria-current={currentView === 'movies' ? 'page' : undefined}
          onClick={e => {
            e.preventDefault()
            onNavigate?.('movies')
          }}
        >
          <Film size={16} aria-hidden="true" />
          <span>Movies</span>
        </a>

        {/* Trending */}
        <a
          href="#trending"
          onClick={e => {
            e.preventDefault()
            handleScrollTo('trending-rail')
          }}
        >
          <Flame size={16} aria-hidden="true" />
          <span>Trending</span>
        </a>

        {/* Schedule */}
        <a
          className={currentView === 'schedule' ? 'active' : ''}
          href="#schedule"
          aria-current={currentView === 'schedule' ? 'page' : undefined}
          onClick={e => {
            e.preventDefault()
            onNavigate?.('schedule')
          }}
        >
          <CalendarDays size={16} aria-hidden="true" />
          <span>Schedule</span>
        </a>

        {/* My List */}
        <a
          className={currentView === 'library' ? 'active' : ''}
          href="#library"
          aria-current={currentView === 'library' ? 'page' : undefined}
          onClick={e => {
            e.preventDefault()
            onNavigate?.('library')
          }}
        >
          <Library size={16} aria-hidden="true" />
          <span>My List</span>
        </a>
      </nav>

      {/* Right-side Actions: Search, Notifications, Auth */}
      <div className="desktop-nav__actions">
        {/* Search */}
        <IconButton
          label="Search anime (Ctrl+K)"
          onClick={onSearch}
        >
          <Search size={18} />
        </IconButton>

        {/* Notifications */}
        <IconButton
          label="Notifications"
          onClick={() => {}}
        >
          <Bell size={18} />
        </IconButton>

        {/* Auth / Profile Actions */}
        {authUser ? (
          <div className="nav-profile-group">
            <button
              type="button"
              className={`profile-chip ${
                currentView === 'profile' ? 'profile-chip--active' : ''
              }`}
              onClick={() =>
                onNavigate ? onNavigate('profile') : onMenu?.()
              }
              aria-label="View user profile"
            >
              <span className="profile-chip__avatar" aria-hidden="true">
                {authUser.username.slice(0, 1).toUpperCase()}
              </span>
              <span className="profile-chip__name">{authUser.username}</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="auth-nav-btn"
            onClick={onOpenAuthModal}
            aria-label="Sign in"
          >
            <LogIn size={15} />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  )
}

/* ─────────────────────────────────────────
   Mobile Navigation
   Bottom capsule for smaller viewports
   ───────────────────────────────────────── */

export function MobileNavigation({
  onNavigate,
  onSearch,
  currentView = 'home',
}: {
  onNavigate?: (view: ViewMode) => void
  onSearch?: () => void
  currentView?: ViewMode
}) {
  if (currentView === 'player') return null

  const items = [
    ['Home', House, 'home'],
    ['Search', Search, 'search'],
    ['Schedule', CalendarDays, 'schedule'],
    ['My List', Library, 'library'],
    ['Profile', UserRound, 'profile'],
  ] as const

  return (
    <nav
      className="mobile-nav glass"
      aria-label="Mobile navigation"
    >
      {items.map(([name, Icon, targetView]) => {
        const isActive =
          targetView !== 'search' && currentView === targetView

        return (
          <a
            className={isActive ? 'active' : ''}
            href={targetView === 'search' ? '#search' : `#${targetView}`}
            key={name}
            aria-current={isActive ? 'page' : undefined}
            onClick={e => {
              e.preventDefault()
              if (targetView === 'search') {
                onSearch?.()
                return
              }
              onNavigate?.(targetView as ViewMode)
            }}
          >
            <Icon size={20} />
            <span>{name}</span>
          </a>
        )
      })}
    </nav>
  )
}

/* ─────────────────────────────────────────
   Menu Trigger
   ───────────────────────────────────────── */

export function MenuTrigger({
  onClick,
}: {
  onClick: () => void
}) {
  return (
    <IconButton
      label="Open menu"
      onClick={onClick}
    >
      <Menu size={18} />
    </IconButton>
  )
}
