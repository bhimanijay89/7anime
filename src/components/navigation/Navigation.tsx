import { Bell, Compass, House, Library, Menu, Search, UserRound, CalendarDays } from 'lucide-react'
import { IconButton } from '../ui/Button'
import './navigation.css'
const links=['Home','Anime','Trending','Movies','Genres','Schedule','Upcoming']
export function Brand(){return <a className="brand" href="#top" aria-label="7anime home"><span>7</span>anime</a>}
export function DesktopNavbar({onMenu,onSearch}:{onMenu:()=>void;onSearch:()=>void}){return <header className="desktop-nav glass"><Brand/><nav aria-label="Main navigation">{links.map((link,i)=><a className={i===0?'active':''} href={`#${link.toLowerCase()}`} key={link}>{link}</a>)}</nav><div className="desktop-nav__actions"><IconButton label="Search" onClick={onSearch}><Search size={18}/></IconButton><IconButton label="Notifications"><Bell size={18}/></IconButton><button className="profile-chip" onClick={onMenu}><UserRound size={16}/> Sign in</button></div></header>}
const mobileItems=[['Home',House],['Explore',Compass],['Schedule',CalendarDays],['Library',Library],['Profile',UserRound]] as const
export function MobileNavigation(){return <nav className="mobile-nav glass" aria-label="Mobile navigation">{mobileItems.map(([name,Icon],i)=><a className={i===0?'active':''} href={`#${name.toLowerCase()}`} key={name}><Icon size={20}/><span>{name}</span></a>)}</nav>}
export function MenuTrigger({onClick}:{onClick:()=>void}){return <IconButton label="Open menu" onClick={onClick}><Menu size={18}/></IconButton>}
