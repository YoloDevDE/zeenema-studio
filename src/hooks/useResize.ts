import {useCallback, useRef} from 'react'

type Direction = 'horizontal' | 'vertical'

interface UseResizeOptions {
    direction: Direction
    min: number
    max: number
    initial: number
    onResize: (size: number) => void
    /** If true, dragging toward negative axis increases size (e.g. drag up = bigger) */
    invert?: boolean
}

/**
 * Returns a mousedown handler to attach to a drag-handle element.
 * Handles all the mousemove/mouseup wiring automatically.
 */
export function useResize({direction, min, max, onResize, invert = false}: UseResizeOptions) {
    const dragging = useRef(false)
    const startPos = useRef(0)
    const startSize = useRef(0)

    const onMouseDown = useCallback(
        (e: React.MouseEvent, currentSize: number) => {
            e.preventDefault()
            dragging.current = true
            startPos.current = direction === 'horizontal' ? e.clientX : e.clientY
            startSize.current = currentSize

            const onMove = (me: MouseEvent) => {
                if (!dragging.current) return
                const pos = direction === 'horizontal' ? me.clientX : me.clientY
                const delta = invert ? startPos.current - pos : pos - startPos.current
                onResize(Math.min(max, Math.max(min, startSize.current + delta)))
            }

            const onUp = () => {
                dragging.current = false
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
            }

            window.addEventListener('mousemove', onMove)
            window.addEventListener('mouseup', onUp)
        },
        [direction, invert, min, max, onResize],
    )

    return onMouseDown
}
