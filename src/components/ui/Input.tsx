import {forwardRef} from 'react'
import {cn} from '@/lib/utils'

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

export const Input = forwardRef<HTMLInputElement, InputProps>(({className, ...props}, ref) => (
    <input
        ref={ref}
        className={cn(
            'h-8 w-full rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] disabled:opacity-40',
            className
        )}
        {...props}
    />
))
Input.displayName = 'Input'
