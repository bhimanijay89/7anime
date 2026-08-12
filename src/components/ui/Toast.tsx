import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
type Toast={id:number;message:string;tone:'success'|'error'|'warning'|'info'}
const ToastContext=createContext<{notify:(message:string,tone?:Toast['tone'])=>void}|null>(null)
export function ToastProvider({children}:{children:ReactNode}){const [toasts,setToasts]=useState<Toast[]>([]);const notify=useCallback((message:string,tone:Toast['tone']='info')=>{const id=Date.now();setToasts(v=>[...v,{id,message,tone}]);window.setTimeout(()=>setToasts(v=>v.filter(t=>t.id!==id)),3500)},[]);return <ToastContext.Provider value={{notify}}>{children}<div className="toasts" aria-live="polite">{toasts.map(t=><div className={`toast toast--${t.tone} glass`} key={t.id}>{t.message}</div>)}</div></ToastContext.Provider>}
export function useToast(){const value=useContext(ToastContext);if(!value)throw new Error('useToast must be used within ToastProvider');return value}
