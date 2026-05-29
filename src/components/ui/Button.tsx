import {forwardRef} from 'react'
import {cva, type VariantProps} from 'class-variance-authority'
import {cn} from '@/lib/utils'

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-1.5 rounded text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-accent)] disabled:pointer-events-none disabled:opacity-40 cursor-pointer',
    {
        variants: {
            variant: {
                default: 'bg-[var(--color-surface-2)] border border-[var(--color-border)] text-[var(--color-text)] hover:bg-[var(--color-border)]',
                primary: 'bg-[var(--color-accent)] text-white hover:bg-[var(--color-accent-hover)]',
                ghost: 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-2)]',
                danger: 'bg-transparent border border-[var(--color-danger)] text-[var(--color-danger)] hover:bg-[var(--color-danger)] hover:text-white',
            },
            size: {
                sm: 'h-7 px-2.5 text-xs',
                md: 'h-8 px-3',
                lg: 'h-9 px-4',
                icon: 'h-8 w-8',
            },
        },
        defaultVariants: {
            variant: 'default',
            size: 'md',
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
        VariantProps<typeof buttonVariants> {
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({className, variant, size, ...props}, ref) => (
        <button ref={ref} className={cn(buttonVariants({variant, size}), className)} {...props} />
    )
)
Button.displayName = 'Button'
