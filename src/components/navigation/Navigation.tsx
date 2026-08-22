import {
  Bell,
  CalendarDays,
  House,
  Library,
  LogIn,
  Menu,
  Search,
  UserRound,
} from 'lucide-react'
import { IconButton } from '../ui/Button'
import logoImg from '../../public/logo.png'
import type { AuthUser } from '../../types/auth'
import './navigation.css'

export type ViewMode =
  | 'home'
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
}: {
  onClick?: () => void
}) {
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
      <img
        src={logoImg}
        alt="7anime"
        className="brand__logo"
      />
    </a>
  )
}

/* ─────────────────────────────────────────
   Desktop Navigation
   ───────────────────────────────────────── */

export function DesktopNavbar({
  onMenu,
  onSearch,
  onNavigate,
  onOpenAuthModal,
  authUser,
  currentView = 'home',
}: {
  onMenu: () => void
  onSearch: () => void
  onNavigate?: (view: ViewMode) => void
  onOpenAuthModal?: () => void
  onLogout?: () => void
  authUser?: AuthUser | null
  currentView?: ViewMode
}) {
  return (
    <header
      className={`desktop-nav glass-elevated ${currentView === 'player'
          ? 'desktop-nav--hidden'
          : ''
        }`}
    >
      {/* Brand */}
      <Brand
        onClick={() =>
          onNavigate?.('home')
        }
      />

      {/* Main Navigation */}
      <nav aria-label="Main navigation">

        {/* Home */}
        <a
          className={
            currentView === 'home'
              ? 'active'
              : ''
          }
          href="#home"
          aria-current={
            currentView === 'home'
              ? 'page'
              : undefined
          }
          onClick={e => {
            e.preventDefault()
            onNavigate?.('home')
          }}
        >
          <House
            size={16}
            aria-hidden="true"
          />
          <span>Home</span>
        </a>

        {/* Schedule */}
        <a
          className={
            currentView === 'schedule'
              ? 'active'
              : ''
          }
          href="#schedule"
          aria-current={
            currentView === 'schedule'
              ? 'page'
              : undefined
          }
          onClick={e => {
            e.preventDefault()
            onNavigate?.('schedule')
          }}
        >
          <CalendarDays
            size={16}
            aria-hidden="true"
          />
          <span>Schedule</span>
        </a>

        {/* Library */}
        <a
          className={
            currentView === 'library'
              ? 'active'
              : ''
          }
          href="#library"
          aria-current={
            currentView === 'library'
              ? 'page'
              : undefined
          }
          onClick={e => {
            e.preventDefault()
            onNavigate?.('library')
          }}
        >
          <Library
            size={16}
            aria-hidden="true"
          />
          <span>Library</span>
        </a>
      </nav>

      {/* Right-side Actions */}
      <div className="desktop-nav__actions">

        {/* Search */}
        <IconButton
          label="Search"
          onClick={onSearch}
        >
          <Search size={18} />
        </IconButton>

        {/* Notifications */}
        <IconButton label="Notifications">
          <Bell size={18} />
        </IconButton>

        {/* Auth / Profile Actions */}
        {authUser ? (
          <div className="nav-profile-group">
            <button
              className={`profile-chip ${currentView === 'profile'
                  ? 'profile-chip--active'
                  : ''
                }`}
              onClick={() =>
                onNavigate
                  ? onNavigate('profile')
                  : onMenu()
              }
              aria-label="View user profile"
            >
              <span
                className="profile-chip__avatar"
                aria-hidden="true"
              >
                {authUser.username.slice(0, 1).toUpperCase()}
              </span>

              <span className="profile-chip__name">
                {authUser.username}
              </span>
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
   Home / Search / Library / Profile
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
    ['Library', Library, 'library'],
    ['Profile', UserRound, 'profile'],
  ] as const

  return (
    <nav
      className="mobile-nav glass"
      aria-label="Mobile navigation"
    >
      {items.map(
        ([name, Icon, targetView]) => {

          const isActive =
            targetView !== 'search' &&
            currentView === targetView

          return (
            <a
              className={
                isActive
                  ? 'active'
                  : ''
              }
              href={
                targetView === 'search'
                  ? '#search'
                  : `#${targetView}`
              }
              key={name}
              aria-current={
                isActive
                  ? 'page'
                  : undefined
              }
              onClick={e => {
                e.preventDefault()

                /* Search */
                if (
                  targetView === 'search'
                ) {
                  onSearch?.()
                  return
                }

                /* Normal navigation */
                onNavigate?.(
                  targetView as ViewMode,
                )
              }}
            >
              <Icon size={20} />

              <span>
                {name}
              </span>
            </a>
          )
        },
      )}
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