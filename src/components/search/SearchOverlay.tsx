import { Search } from 'lucide-react'
import { useState } from 'react'
import { Modal } from '../ui/Overlay'
export function SearchOverlay({open,onClose}:{open:boolean;onClose:()=>void}){const [query,setQuery]=useState('');return <Modal open={open} onClose={onClose} title="Search anime"><label className="search-box"><Search size={18}/><input autoFocus value={query} onChange={e=>setQuery(e.target.value)} placeholder="Titles, characters, genres…"/></label><p className="search-help">Start typing to discover titles. Search results connect to the catalog in a future phase.</p>{query&&<button className="search-result" onClick={onClose}><span className="search-result__thumb"/><span><strong>{query}</strong><small>Mock search suggestion</small></span></button>}</Modal>}
