import { SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../ui/Badge'
import './filters.css'
const groups={Genre:['Action','Fantasy','Romance'],Type:['TV','Movie'],Season:['Spring','Summer'],Status:['Airing','Completed'],Language:['Sub','Dub']}
export function FilterPanel(){const [selected,setSelected]=useState<string[]>(['Action']);const toggle=(tag:string)=>setSelected(v=>v.includes(tag)?v.filter(x=>x!==tag):[...v,tag]);return <section className="filter-panel glass" aria-label="Anime filters"><header><SlidersHorizontal size={18}/><strong>Discover filters</strong><button onClick={()=>setSelected([])}>Clear</button></header><div className="filter-groups">{Object.entries(groups).map(([label,items])=><div key={label}><span>{label}</span><div>{items.map(item=><button key={item} className={selected.includes(item)?'selected':''} onClick={()=>toggle(item)} aria-pressed={selected.includes(item)}>{item}</button>)}</div></div>)}</div>{selected.length>0&&<div className="filter-panel__active">{selected.map(x=><Badge key={x} tone="accent">{x}</Badge>)}</div>}</section>}
