import type { ButtonHTMLAttributes, ReactNode } from 'react'
import './ui.css'
type Variant = 'primary'|'secondary'|'glass'|'ghost'|'danger'|'success'
export function Button({ variant='primary', loading, children, className='', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {variant?:Variant;loading?:boolean;children:ReactNode}) { return <button className={`button button--${variant} ${className}`} disabled={loading || props.disabled} {...props}>{loading && <span className="spinner" aria-hidden="true"/>}{children}</button> }
export function IconButton({ label, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & {label:string;children:ReactNode}) { return <button className="icon-button glass" aria-label={label} {...props}>{children}</button> }
