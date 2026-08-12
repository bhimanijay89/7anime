import { Share2 } from 'lucide-react'
import { useState } from 'react'
import type { ShareData } from '../../types/domain'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Overlay'
export function ShareButton({data}:{data:ShareData}){const [open,setOpen]=useState(false);const copy=async()=>{await navigator.clipboard?.writeText(data.url);setOpen(false)};return <><Button variant="glass" onClick={()=>setOpen(true)}><Share2 size={16}/> Share</Button><Modal open={open} onClose={()=>setOpen(false)} title={`Share ${data.title}`}><p className="share-copy">{data.description||'Share this title with your friends.'}</p><div className="share-actions"><Button onClick={copy}>Copy link</Button><Button variant="secondary" onClick={()=>navigator.share?.({title:data.title,url:data.url})}>Native share</Button></div></Modal></>}
