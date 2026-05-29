import {useEffect, useRef} from 'react'

export interface ContextMenuItem {
    label: string
    icon?: React.ReactNode
    onClick: () => void
    danger?: boolean
}

interface ContextMenuProps {
    x: number
    y: number
    items: ContextMenuItem[]
    onClose: () => void
}

export function ContextMenu({x, y, items, onClose}: ContextMenuProps) {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleDown = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onClose()
        }
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('mousedown', handleDown)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('mousedown', handleDown)
            document.removeEventListener('keydown', handleKey)
        }
    }, [onClose])

    // Clamp to viewport
    const style: React.CSSProperties = {
        position: 'fixed',
        top: y,
        left: x,
        zIndex: 9999,
    }

    return (
        <div
            ref={ref}
            style={style}
            className="min-w-[140px] rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl py-1 select-none"
        >
            {items.map((item, i) => (
                <button
                    key={i}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs text-left transition-colors ${
                        item.danger
                            ? 'text-[var(--color-danger)] hover:bg-[var(--color-danger)]/10'
                            : 'text-[var(--color-text)] hover:bg-[var(--color-surface-2)]'
                    }`}
                    onClick={() => {
                        item.onClick()
                        onClose()
                    }}
                >
                    {item.icon && <span className="shrink-0 opacity-70">{item.icon}</span>}
                    {item.label}
                </button>
            ))}
        </div>
    )
}
