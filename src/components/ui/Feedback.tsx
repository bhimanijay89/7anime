import type { ReactNode } from 'react'
import { Button } from './Button'
export function Skeleton({ className='' }:{className?:string}) {return <span className={`skeleton ${className}`} aria-hidden="true"/>}
export function Spinner(){return <span className="spinner spinner--large" aria-label="Loading" role="status"/>}
export function EmptyState({icon='◇',title,description,action}:{icon?:string;title:string;description:string;action?:ReactNode}) {return <section className="state glass"><span className="state__icon">{icon}</span><h2>{title}</h2><p>{description}</p>{action}</section>}
export function ErrorState({onRetry}:{onRetry?:()=>void}){return <EmptyState icon="!" title="Something went wrong" description="We couldn't load this content. Please try again." action={onRetry?<Button onClick={onRetry}>Try again</Button>:undefined}/>}
